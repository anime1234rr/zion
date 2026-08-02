import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { ServerItem } from '@/lib/types'

export interface ChannelPermissions {
  loading: boolean
  canSendMessages: boolean
  canSendFiles: boolean
  canReact: boolean
  canForceMuteVoice: boolean
  canMentionEveryone: boolean
  canUseExternalLinks: boolean
  canConnectVoice: boolean
  canSpeakVoice: boolean
}

const ALLOWED: ChannelPermissions = {
  loading: false,
  canSendMessages: true,
  canSendFiles: true,
  canReact: true,
  canForceMuteVoice: true,
  canMentionEveryone: true,
  canUseExternalLinks: true,
  canConnectVoice: true,
  canSpeakVoice: true,
}

interface MiembroConRolRow {
  rol_id: string | null
  roles_servidor: { permisos: Record<string, boolean> | null } | { permisos: Record<string, boolean> | null }[] | null
}

export function useChannelPermissions(
  server: ServerItem,
  canalId: string,
  userId: string | undefined
): ChannelPermissions {
  const isOwner = Boolean(userId) && server.ownerId === userId
  const [state, setState] = useState<ChannelPermissions>({ ...ALLOWED, loading: !isOwner })

  useEffect(() => {
    if (isOwner || !userId) return

    let cancelado = false

    async function cargar() {
      const { data: miembro } = await supabase
        .from('miembros_servidor')
        .select('rol_id, roles_servidor(permisos)')
        .eq('servidor_id', server.id)
        .eq('usuario_id', userId as string)
        .maybeSingle<MiembroConRolRow>()

      if (cancelado) return

      const rolInfo = Array.isArray(miembro?.roles_servidor)
        ? miembro?.roles_servidor[0]
        : miembro?.roles_servidor
      const permisosGenerales = rolInfo?.permisos ?? {}
      const esAdmin = Boolean(permisosGenerales.todo || permisosGenerales.admin)

      if (esAdmin || !miembro?.rol_id) {
        setState(ALLOWED)
        return
      }

      const { data: overrideRow } = await supabase
        .from('permisos_canal_rol')
        .select('permisos')
        .eq('canal_id', canalId)
        .eq('rol_id', miembro.rol_id)
        .maybeSingle<{ permisos: Record<string, boolean> }>()

      if (cancelado) return

      const overrides = overrideRow?.permisos ?? {}
      const resolve = (key: string, fallbackGeneralKey?: string, defaultValue = true) => {
        if (key in overrides) return Boolean(overrides[key])
        if (fallbackGeneralKey && fallbackGeneralKey in permisosGenerales) {
          return Boolean(permisosGenerales[fallbackGeneralKey])
        }
        return defaultValue
      }

      setState({
        loading: false,
        canSendMessages: resolve('enviar_mensajes', 'enviar_mensajes'),
        canSendFiles: resolve('enviar_archivos'),
        canReact: resolve('anadir_reacciones'),
        canForceMuteVoice: resolve('silenciar_miembros_voz'),
        canMentionEveryone: resolve('mencionar_todos', 'mencionar_todos', false),
        canUseExternalLinks: resolve('usar_enlaces_externos'),
        canConnectVoice: resolve('conectar_canal_voz', 'conectar_voz'),
        canSpeakVoice: resolve('hablar_voz', 'transmitir_voz'),
      })
    }

    cargar()

    const channel = supabase
      .channel(`permisos-canal-${canalId}-${userId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permisos_canal_rol', filter: `canal_id=eq.${canalId}` },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'miembros_servidor', filter: `usuario_id=eq.${userId}` },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'roles_servidor', filter: `servidor_id=eq.${server.id}` },
        () => cargar()
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [server.id, server.ownerId, canalId, userId, isOwner])

  return isOwner ? ALLOWED : state
}
