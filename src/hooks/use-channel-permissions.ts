import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { listarRolesDeServidor } from '@/lib/members'
import type { ServerItem } from '@/lib/types'

export interface ChannelPermissions {
  loading: boolean
  canView: boolean
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
  canView: true,
  canSendMessages: true,
  canSendFiles: true,
  canReact: true,
  canForceMuteVoice: true,
  canMentionEveryone: true,
  canUseExternalLinks: true,
  canConnectVoice: true,
  canSpeakVoice: true,
}

const DENIED: ChannelPermissions = {
  loading: false,
  canView: false,
  canSendMessages: false,
  canSendFiles: false,
  canReact: false,
  canForceMuteVoice: false,
  canMentionEveryone: false,
  canUseExternalLinks: false,
  canConnectVoice: false,
  canSpeakVoice: false,
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
  const [state, setState] = useState<ChannelPermissions>({ ...DENIED, loading: !isOwner })

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
      let permisosGenerales = rolInfo?.permisos ?? {}
      const esAdmin = Boolean(permisosGenerales.todo || permisosGenerales.admin)

      if (esAdmin) {
        setState(ALLOWED)
        return
      }

      let rolId = miembro?.rol_id ?? null

      if (!rolId) {
        const roles = await listarRolesDeServidor(server.id)
        if (cancelado) return
        const rolBase = roles.find((r) => r.esRolBase)
        rolId = rolBase?.id ?? null
        permisosGenerales = rolBase?.permisos ?? {}
      }

      if (!rolId) {
        setState(DENIED)
        return
      }

      const { data: canalRow } = await supabase
        .from('canales_servidor')
        .select('categoria_id, hilo_padre_id')
        .eq('id', canalId)
        .maybeSingle<{ categoria_id: string | null; hilo_padre_id: string | null }>()

      if (cancelado) return

      const padreId = canalRow?.categoria_id ?? canalRow?.hilo_padre_id ?? null
      const idsAConsultar = padreId ? [canalId, padreId] : [canalId]

      const { data: overrideRows } = await supabase
        .from('permisos_canal_rol')
        .select('canal_id, permisos')
        .in('canal_id', idsAConsultar)
        .eq('rol_id', rolId)
        .returns<{ canal_id: string; permisos: Record<string, boolean> }[]>()

      if (cancelado) return

      const overridesPorCanal = new Map((overrideRows ?? []).map((r) => [r.canal_id, r.permisos ?? {}]))
      const overridesCanal = overridesPorCanal.get(canalId)
      const overridesCategoria = padreId ? overridesPorCanal.get(padreId) : undefined

      const resolve = (key: string, fallbackGeneralKey?: string) => {
        if (overridesCanal !== undefined) return Boolean(overridesCanal[key])
        if (overridesCategoria !== undefined) return Boolean(overridesCategoria[key])
        if (fallbackGeneralKey && fallbackGeneralKey in permisosGenerales) {
          return Boolean(permisosGenerales[fallbackGeneralKey])
        }
        return false
      }

      setState({
        loading: false,
        canView: resolve('ver_canal'),
        canSendMessages: resolve('enviar_mensajes', 'enviar_mensajes'),
        canSendFiles: resolve('enviar_archivos'),
        canReact: resolve('anadir_reacciones'),
        canForceMuteVoice: resolve('silenciar_miembros_voz'),
        canMentionEveryone: resolve('mencionar_todos', 'mencionar_todos'),
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
        { event: '*', schema: 'public', table: 'permisos_canal_rol' },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'canales_servidor', filter: `id=eq.${canalId}` },
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
