import { useEffect, useState } from 'react'

import { getErrorMessage } from '@/lib/utils'
import { selectScreenSource } from '@/lib/electron-bridge'
import { getAudioSettings, suscribirseAAudioSettings } from '@/hooks/use-audio-settings'
import {
  actualizarEstadoVoz,
  forzarSilencioVoz,
  iniciarHeartbeatVoz,
  listarParticipantesDeVoz,
  salirDeVoz,
  suscribirseAEstadosVoz,
  unirseAVoz,
  type VoiceParticipant,
} from '@/lib/voice'
import { VoiceWebRtcSession, type RemoteTrackKind } from '@/lib/voice-webrtc'

const MAX_VIDEO_STREAMS = 4
const CAMERA_CONSTRAINTS: MediaStreamConstraints['video'] = {
  width: 640,
  height: 480,
  frameRate: 24,
}
const SCREEN_CONSTRAINTS: MediaStreamConstraints['video'] = {
  frameRate: { ideal: 15, max: 20 },
}

const SPEAKING_THRESHOLD = 0.02
const SPEAKING_HOLD_MS = 350
const SPEAKING_POLL_MS = 100

export interface RemoteMediaStreams {
  camera?: MediaStream
  screen?: MediaStream
}

export interface VoiceConnectionState {
  connectedChannelId: string | null
  connectedServerId: string | null
  connectedChannelName: string | null
  connecting: boolean
  participants: VoiceParticipant[]
  muted: boolean
  deafened: boolean
  cameraOn: boolean
  sharingScreen: boolean
  localCameraStream: MediaStream | null
  localScreenStream: MediaStream | null
  remoteStreams: Record<string, RemoteMediaStreams>
  speakingUserIds: Set<string>
  error: string | null
}

type Listener = (state: VoiceConnectionState) => void

let state: VoiceConnectionState = {
  connectedChannelId: null,
  connectedServerId: null,
  connectedChannelName: null,
  connecting: false,
  participants: [],
  muted: false,
  deafened: false,
  cameraOn: false,
  sharingScreen: false,
  localCameraStream: null,
  localScreenStream: null,
  remoteStreams: {},
  speakingUserIds: new Set(),
  error: null,
}

const listeners = new Set<Listener>()
const audioElements = new Map<string, HTMLAudioElement>()

let session: VoiceWebRtcSession | null = null
let stopRosterSub: (() => void) | null = null
let stopHeartbeat: (() => void) | null = null
let stopAudioSettingsSub: (() => void) | null = null
let activeMicStream: MediaStream | null = null
let currentUserId: string | null = null

function setState(patch: Partial<VoiceConnectionState>) {
  state = { ...state, ...patch }
  for (const listener of listeners) listener(state)
}

interface SpeakingAnalyser {
  audioCtx: AudioContext
  source: MediaStreamAudioSourceNode
  analyser: AnalyserNode
  dataArray: Uint8Array<ArrayBuffer>
  lastLoudAt: number
}

const speakingAnalysers = new Map<string, SpeakingAnalyser>()
let speakingPollHandle: ReturnType<typeof setInterval> | null = null

function computeRms(dataArray: Uint8Array<ArrayBuffer>): number {
  let sumSquares = 0
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128
    sumSquares += normalized * normalized
  }
  return Math.sqrt(sumSquares / dataArray.length)
}

function ensureSpeakingPoll() {
  if (speakingPollHandle) return
  speakingPollHandle = setInterval(() => {
    const now = Date.now()
    let changed = false
    const next = new Set(state.speakingUserIds)

    for (const [userId, entry] of speakingAnalysers) {
      entry.analyser.getByteTimeDomainData(entry.dataArray)
      if (computeRms(entry.dataArray) > SPEAKING_THRESHOLD) entry.lastLoudAt = now
      const isSpeaking = now - entry.lastLoudAt < SPEAKING_HOLD_MS

      if (isSpeaking && !next.has(userId)) {
        next.add(userId)
        changed = true
      } else if (!isSpeaking && next.has(userId)) {
        next.delete(userId)
        changed = true
      }
    }

    if (changed) setState({ speakingUserIds: next })
  }, SPEAKING_POLL_MS)
}

function stopSpeakingPoll() {
  if (!speakingPollHandle) return
  clearInterval(speakingPollHandle)
  speakingPollHandle = null
}

function startSpeakingAnalysis(userId: string, stream: MediaStream) {
  stopSpeakingAnalysis(userId)
  if (stream.getAudioTracks().length === 0) return

  try {
    const audioCtx = new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.6
    source.connect(analyser)

    speakingAnalysers.set(userId, {
      audioCtx,
      source,
      analyser,
      dataArray: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)),
      lastLoudAt: 0,
    })
    ensureSpeakingPoll()
  } catch (err) {
    console.error('No se pudo iniciar la detección de voz', err)
  }
}

function stopSpeakingAnalysis(userId: string) {
  const entry = speakingAnalysers.get(userId)
  if (!entry) return

  entry.source.disconnect()
  entry.audioCtx.close().catch(() => {})
  speakingAnalysers.delete(userId)

  if (state.speakingUserIds.has(userId)) {
    const next = new Set(state.speakingUserIds)
    next.delete(userId)
    setState({ speakingUserIds: next })
  }
  if (speakingAnalysers.size === 0) stopSpeakingPoll()
}

function stopAllSpeakingAnalysis() {
  for (const userId of [...speakingAnalysers.keys()]) stopSpeakingAnalysis(userId)
}

function attachRemoteAudio(userId: string, stream: MediaStream) {
  let el = audioElements.get(userId)
  if (!el) {
    el = document.createElement('audio')
    el.autoplay = true
    el.dataset.voiceUser = userId
    document.body.appendChild(el)
    audioElements.set(userId, el)
  }
  el.srcObject = stream
  el.muted = state.deafened
}

function detachRemoteAudio(userId: string) {
  const el = audioElements.get(userId)
  if (!el) return
  el.srcObject = null
  el.remove()
  audioElements.delete(userId)
}

function setRemoteStream(userId: string, kind: RemoteTrackKind, stream: MediaStream | null) {
  if (kind === 'mic') {
    if (stream) {
      attachRemoteAudio(userId, stream)
      startSpeakingAnalysis(userId, stream)
    } else {
      detachRemoteAudio(userId)
      stopSpeakingAnalysis(userId)
    }
    return
  }

  const next = { ...state.remoteStreams }
  const entry = { ...next[userId] }
  if (stream) entry[kind] = stream
  else delete entry[kind]

  if (entry.camera || entry.screen) next[userId] = entry
  else delete next[userId]

  setState({ remoteStreams: next })
}

async function refreshRoster(canalId: string) {
  try {
    const participants = await listarParticipantesDeVoz(canalId)
    const previousIds = new Set(state.participants.map((p) => p.user.id))
    const nextIds = new Set(participants.map((p) => p.user.id))

    if (session && currentUserId) {
      for (const id of nextIds) {
        if (id !== currentUserId && !previousIds.has(id)) session.ensurePeer(id)
      }
      for (const id of previousIds) {
        if (!nextIds.has(id)) session.removePeer(id)
      }
    }

    const self = participants.find((p) => p.user.id === currentUserId)
    if (self && self.muted !== state.muted) {
      session?.setMuted(self.muted)
      setState({ participants, muted: self.muted })
      return
    }

    setState({ participants })
  } catch (err) {
    console.error('No se pudo actualizar la lista de conectados a voz', err)
  }
}

function activeVideoParticipantCount(excludingSelf: boolean): number {
  return state.participants.filter((p) => {
    if (excludingSelf && p.user.id === currentUserId) return false
    return p.cameraOn || p.sharingScreen
  }).length
}

export async function joinVoiceChannel(
  canalId: string,
  userId: string,
  serverId: string,
  channelName: string
): Promise<void> {
  if (state.connectedChannelId === canalId) return
  if (state.connectedChannelId) await leaveVoiceChannel()

  setState({ connecting: true, error: null, connectedServerId: serverId, connectedChannelName: channelName })
  currentUserId = userId

  try {
    const audioSettings = getAudioSettings()
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: audioSettings.echoCancellation,
        noiseSuppression: audioSettings.noiseSuppression,
        autoGainControl: audioSettings.autoGainControl,
      },
    })
    await unirseAVoz(canalId)

    activeMicStream = micStream
    stopAudioSettingsSub = suscribirseAAudioSettings((settings) => {
      activeMicStream
        ?.getAudioTracks()[0]
        ?.applyConstraints({
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
        })
        .catch((err) => console.error('No se pudieron aplicar los ajustes de audio', err))
    })

    session = new VoiceWebRtcSession(canalId, userId, micStream, {
      onRemoteTrack: (remoteUserId, kind, stream) => setRemoteStream(remoteUserId, kind, stream),
      onRemoteTrackEnded: (remoteUserId, kind) => setRemoteStream(remoteUserId, kind, null),
      onPeerClosed: (remoteUserId) => {
        detachRemoteAudio(remoteUserId)
        stopSpeakingAnalysis(remoteUserId)
        const next = { ...state.remoteStreams }
        delete next[remoteUserId]
        setState({ remoteStreams: next })
      },
    })
    session.setMuted(state.muted)
    startSpeakingAnalysis(userId, micStream)

    stopHeartbeat = iniciarHeartbeatVoz()
    stopRosterSub = suscribirseAEstadosVoz(canalId, {
      onCambio: () => refreshRoster(canalId),
    })

    await refreshRoster(canalId)
    setState({ connectedChannelId: canalId, connecting: false })
  } catch (err) {
    setState({
      connecting: false,
      error: getErrorMessage(err),
      connectedServerId: null,
      connectedChannelName: null,
    })
    session?.close()
    session = null
    currentUserId = null
    stopAudioSettingsSub?.()
    stopAudioSettingsSub = null
    activeMicStream = null
  }
}

export async function leaveVoiceChannel(): Promise<void> {
  if (!state.connectedChannelId) return

  stopHeartbeat?.()
  stopHeartbeat = null
  stopRosterSub?.()
  stopRosterSub = null
  stopAudioSettingsSub?.()
  stopAudioSettingsSub = null
  activeMicStream = null
  session?.close()
  session = null
  currentUserId = null

  for (const userId of [...audioElements.keys()]) detachRemoteAudio(userId)
  stopAllSpeakingAnalysis()

  setState({
    connectedChannelId: null,
    connectedServerId: null,
    connectedChannelName: null,
    participants: [],
    muted: false,
    deafened: false,
    cameraOn: false,
    sharingScreen: false,
    localCameraStream: null,
    localScreenStream: null,
    remoteStreams: {},
    speakingUserIds: new Set(),
  })

  try {
    await salirDeVoz()
  } catch (err) {
    console.error('No se pudo notificar la desconexión del canal de voz', err)
  }
}

export async function toggleMute(): Promise<void> {
  const next = !state.muted
  setState({ muted: next })
  session?.setMuted(next)
  if (state.connectedChannelId) {
    try {
      await actualizarEstadoVoz({ muted: next })
    } catch (err) {
      console.error('No se pudo sincronizar el silenciado', err)
    }
  }
}

export async function toggleDeafen(): Promise<void> {
  const next = !state.deafened
  const nextMuted = next ? true : state.muted
  setState({ deafened: next, muted: nextMuted })
  session?.setMuted(nextMuted)
  for (const el of audioElements.values()) el.muted = next
  if (state.connectedChannelId) {
    try {
      await actualizarEstadoVoz({ muted: nextMuted, deafened: next })
    } catch (err) {
      console.error('No se pudo sincronizar el ensordecido', err)
    }
  }
}

export async function toggleCamera(): Promise<void> {
  if (!state.connectedChannelId || !session) return

  if (state.cameraOn) {
    session.removeLocalStream('camera')
    setState({ cameraOn: false, localCameraStream: null })
    try {
      await actualizarEstadoVoz({ cameraOn: false })
    } catch (err) {
      console.error('No se pudo sincronizar el apagado de cámara', err)
    }
    return
  }

  if (activeVideoParticipantCount(true) >= MAX_VIDEO_STREAMS) {
    setState({
      error: `Se alcanzó el máximo de ${MAX_VIDEO_STREAMS} transmisiones de video simultáneas en este canal.`,
    })
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: CAMERA_CONSTRAINTS })
    session.addLocalStream('camera', stream)
    setState({ cameraOn: true, localCameraStream: stream, error: null })
    await actualizarEstadoVoz({ cameraOn: true })
  } catch (err) {
    setState({ error: getErrorMessage(err) })
  }
}

export async function startScreenShare(sourceId: string, includeAudio: boolean): Promise<void> {
  if (!state.connectedChannelId || !session) return

  if (activeVideoParticipantCount(true) >= MAX_VIDEO_STREAMS) {
    setState({
      error: `Se alcanzó el máximo de ${MAX_VIDEO_STREAMS} transmisiones de video simultáneas en este canal.`,
    })
    return
  }

  try {
    selectScreenSource(sourceId, includeAudio)
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: SCREEN_CONSTRAINTS,
      audio: includeAudio,
    })

    stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      stopScreenShare()
    })

    session.addLocalStream('screen', stream)
    setState({ sharingScreen: true, localScreenStream: stream, error: null })
    await actualizarEstadoVoz({ sharingScreen: true })
  } catch (err) {
    setState({ error: getErrorMessage(err) })
  }
}

export async function stopScreenShare(): Promise<void> {
  if (!session || !state.sharingScreen) return

  session.removeLocalStream('screen')
  setState({ sharingScreen: false, localScreenStream: null })
  try {
    await actualizarEstadoVoz({ sharingScreen: false })
  } catch (err) {
    console.error('No se pudo sincronizar el fin de la pantalla compartida', err)
  }
}

export async function toggleForceMuteParticipant(usuarioObjetivoId: string, silenciado: boolean): Promise<void> {
  await forzarSilencioVoz(usuarioObjetivoId, silenciado)
}

export function useVoiceConnection(): VoiceConnectionState {
  const [snapshot, setSnapshot] = useState(state)

  useEffect(() => {
    listeners.add(setSnapshot)
    return () => {
      listeners.delete(setSnapshot)
    }
  }, [])

  return snapshot
}
