import { supabase } from '@/lib/supabase'

// STUN público — alcanza para la mayoría de las conexiones. Para el
// porcentaje de usuarios detrás de NAT simétrico/firewalls estrictos
// hace falta sumar un servidor TURN acá (proveedor gestionado tipo
// Metered.ca/Twilio, no coturn propio) — sin eso, esas conexiones
// puntuales van a fallar en armar el peer connection.
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

type SignalKind = 'offer' | 'answer' | 'ice'
export type RemoteTrackKind = 'mic' | 'camera' | 'screen'

interface StreamKindsMeta {
  micStreamId?: string
  cameraStreamId?: string
  screenStreamId?: string
}

interface SignalPayload {
  from: string
  to: string
  kind: SignalKind
  data: unknown
}

interface PeerState {
  pc: RTCPeerConnection
  /** El de userId mayor cede en colisiones de oferta (patrón "perfect negotiation" de WebRTC). */
  polite: boolean
  makingOffer: boolean
  ignoreOffer: boolean
  remoteMeta: StreamKindsMeta
}

export interface VoiceWebRtcCallbacks {
  onRemoteTrack: (userId: string, kind: RemoteTrackKind, stream: MediaStream) => void
  onRemoteTrackEnded: (userId: string, kind: RemoteTrackKind) => void
  onPeerClosed: (userId: string) => void
}

/**
 * Malla P2P de audio/video sobre un canal de Realtime Broadcast por
 * canal de voz. Sin servidor de medios: cada par arma su propia
 * RTCPeerConnection y el contenido viaja directo entre navegadores —
 * Supabase nunca ve un byte de audio/video, solo señalización (SDP e
 * ICE, texto liviano).
 *
 * Agregar cámara o pantalla es simplemente addTrack() sobre las
 * conexiones ya existentes; WebRTC dispara "negotiationneeded" solo,
 * y esa renegociación va por el mismo canal de señalización que la
 * conexión inicial — no hace falta infraestructura nueva. Como dos
 * personas pueden renegociar casi al mismo tiempo (glare), se
 * implementa el patrón "perfect negotiation" (MDN): el peer de
 * userId mayor es "polite" y cede ante una oferta entrante en
 * colisión; el de userId menor es "impolite" y su oferta gana.
 *
 * Cada stream local (mic/cámara/pantalla) viaja con su propio
 * MediaStream.id, que WebRTC preserva íntegro del otro lado vía SDP
 * (msid). Ese id se manda como metadata junto a cada oferta/respuesta
 * para que el receptor pueda clasificar cada track entrante como
 * mic/cámara/pantalla sin adivinar.
 */
export class VoiceWebRtcSession {
  private readonly userId: string
  private readonly callbacks: VoiceWebRtcCallbacks
  private readonly peers = new Map<string, PeerState>()
  private readonly channel: ReturnType<typeof supabase.channel>
  private closed = false

  private micStream: MediaStream | null = null
  private cameraStream: MediaStream | null = null
  private screenStream: MediaStream | null = null

  constructor(canalId: string, userId: string, micStream: MediaStream, callbacks: VoiceWebRtcCallbacks) {
    this.userId = userId
    this.micStream = micStream
    this.callbacks = callbacks
    this.channel = supabase
      .channel(`voz-senal-${canalId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        this.handleSignal(payload as SignalPayload)
      })
    this.channel.subscribe()
  }

  /** Se llama cuando aparece un participante nuevo en el roster. */
  ensurePeer(remoteUserId: string): void {
    if (this.closed || remoteUserId === this.userId || this.peers.has(remoteUserId)) return
    this.peers.set(remoteUserId, this.createPeer(remoteUserId))
  }

  /** Se llama cuando un participante se va del roster. */
  removePeer(remoteUserId: string): void {
    const state = this.peers.get(remoteUserId)
    if (!state) return
    state.pc.close()
    this.peers.delete(remoteUserId)
    this.callbacks.onPeerClosed(remoteUserId)
  }

  setMuted(muted: boolean): void {
    if (!this.micStream) return
    for (const track of this.micStream.getAudioTracks()) track.enabled = !muted
  }

  /** Prende cámara o pantalla: agrega el stream a todas las conexiones activas. */
  addLocalStream(kind: 'camera' | 'screen', stream: MediaStream): void {
    if (kind === 'camera') this.cameraStream = stream
    else this.screenStream = stream

    for (const state of this.peers.values()) {
      for (const track of stream.getTracks()) {
        state.pc.addTrack(track, stream)
      }
    }
  }

  /** Apaga cámara o pantalla: saca el stream de todas las conexiones y libera el hardware. */
  removeLocalStream(kind: 'camera' | 'screen'): void {
    const stream = kind === 'camera' ? this.cameraStream : this.screenStream
    if (!stream) return

    const tracks = stream.getTracks()
    for (const state of this.peers.values()) {
      for (const sender of state.pc.getSenders()) {
        if (sender.track && tracks.includes(sender.track)) {
          state.pc.removeTrack(sender)
        }
      }
    }

    for (const track of tracks) track.stop()
    if (kind === 'camera') this.cameraStream = null
    else this.screenStream = null
  }

  close(): void {
    this.closed = true
    for (const [remoteUserId, state] of this.peers) {
      state.pc.close()
      this.callbacks.onPeerClosed(remoteUserId)
    }
    this.peers.clear()
    supabase.removeChannel(this.channel)
    for (const stream of [this.micStream, this.cameraStream, this.screenStream]) {
      if (!stream) continue
      for (const track of stream.getTracks()) track.stop()
    }
    this.micStream = null
    this.cameraStream = null
    this.screenStream = null
  }

  private currentStreamKinds(): StreamKindsMeta {
    return {
      micStreamId: this.micStream?.id,
      cameraStreamId: this.cameraStream?.id,
      screenStreamId: this.screenStream?.id,
    }
  }

  private classifyStream(state: PeerState, streamId: string | undefined): RemoteTrackKind {
    if (streamId && streamId === state.remoteMeta.cameraStreamId) return 'camera'
    if (streamId && streamId === state.remoteMeta.screenStreamId) return 'screen'
    return 'mic'
  }

  private createPeer(remoteUserId: string): PeerState {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const state: PeerState = {
      pc,
      polite: this.userId > remoteUserId,
      makingOffer: false,
      ignoreOffer: false,
      remoteMeta: {},
    }

    for (const stream of [this.micStream, this.cameraStream, this.screenStream]) {
      if (!stream) continue
      for (const track of stream.getTracks()) pc.addTrack(track, stream)
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) this.sendSignal(remoteUserId, 'ice', event.candidate.toJSON())
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0]
      const kind = this.classifyStream(state, stream?.id)
      if (stream) this.callbacks.onRemoteTrack(remoteUserId, kind, stream)
      event.track.addEventListener('ended', () => {
        this.callbacks.onRemoteTrackEnded(remoteUserId, kind)
      })
    }

    pc.onnegotiationneeded = async () => {
      try {
        state.makingOffer = true
        await pc.setLocalDescription()
        this.sendSignal(remoteUserId, 'offer', {
          sdp: pc.localDescription,
          ...this.currentStreamKinds(),
        })
      } catch (err) {
        console.error('No se pudo renegociar la conexión de voz', err)
      } finally {
        state.makingOffer = false
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(remoteUserId)
      }
    }

    return state
  }

  private async handleSignal(payload: SignalPayload): Promise<void> {
    if (!payload || payload.to !== this.userId) return

    const remoteUserId = payload.from
    let state = this.peers.get(remoteUserId)
    if (!state) {
      state = this.createPeer(remoteUserId)
      this.peers.set(remoteUserId, state)
    }
    const { pc } = state

    try {
      if (payload.kind === 'offer' || payload.kind === 'answer') {
        const { sdp, ...meta } = payload.data as { sdp: RTCSessionDescriptionInit } & StreamKindsMeta

        const offerCollision =
          sdp.type === 'offer' && (state.makingOffer || pc.signalingState !== 'stable')

        state.ignoreOffer = !state.polite && offerCollision
        if (state.ignoreOffer) return

        state.remoteMeta = meta
        await pc.setRemoteDescription(sdp)

        if (sdp.type === 'offer') {
          await pc.setLocalDescription()
          this.sendSignal(remoteUserId, 'answer', {
            sdp: pc.localDescription,
            ...this.currentStreamKinds(),
          })
        }
      } else if (payload.kind === 'ice') {
        try {
          await pc.addIceCandidate(payload.data as RTCIceCandidateInit)
        } catch (err) {
          if (!state.ignoreOffer) throw err
        }
      }
    } catch (err) {
      console.error('No se pudo procesar la señal de voz', err)
    }
  }

  private sendSignal(to: string, kind: SignalKind, data: unknown): void {
    const payload: SignalPayload = { from: this.userId, to, kind, data }
    this.channel.send({ type: 'broadcast', event: 'signal', payload })
  }
}
