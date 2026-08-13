import { useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { listarPermisosDeRolEnCanales } from '@/lib/channels'
import { listarRolesDeServidor, obtenerMembresiaDeUsuario } from '@/lib/members'
import type { ChannelCategory, ChannelItem, ServerItem } from '@/lib/types'

const EMPTY_SET = new Set<string>()

export function useChannelAccess(
  server: ServerItem | null,
  categories: ChannelCategory[],
  userId: string | undefined
): Set<string> {
  const isOwner = Boolean(server && userId && server.ownerId === userId)
  const allChannels = useMemo<ChannelItem[]>(
    () => categories.flatMap((category) => category.channels),
    [categories]
  )
  const allChannelIds = useMemo(() => allChannels.map((channel) => channel.id), [allChannels])
  const loadingHidden = useMemo(() => new Set(allChannelIds), [allChannelIds])
  const [state, setState] = useState<{ loaded: boolean; hidden: Set<string> }>({
    loaded: false,
    hidden: new Set(),
  })

  useEffect(() => {
    if (!server?.id || isOwner || !userId) return

    const servidorId = server.id
    let cancelado = false

    async function cargar() {
      const membresia = await obtenerMembresiaDeUsuario(servidorId, userId as string)
      if (cancelado) return

      let rol = membresia?.role ?? null
      const esAdmin = Boolean(rol?.permisos.todo || rol?.permisos.admin)

      if (esAdmin) {
        setState({ loaded: true, hidden: new Set() })
        return
      }

      if (!rol) {
        const roles = await listarRolesDeServidor(servidorId)
        if (cancelado) return
        rol = roles.find((r) => r.esRolBase) ?? null
      }

      if (!rol) {
        setState({ loaded: true, hidden: new Set(allChannelIds) })
        return
      }

      const overrides = await listarPermisosDeRolEnCanales(rol.id)
      if (cancelado) return

      const overridesByCanalId = new Map(overrides.map((o) => [o.canalId, o.permisos]))
      const hidden = new Set<string>()
      for (const channel of allChannels) {
        const overridesCanal = overridesByCanalId.get(channel.id)
        const overridesCategoria = channel.categoryId
          ? overridesByCanalId.get(channel.categoryId)
          : undefined
        const verCanal =
          overridesCanal !== undefined
            ? Boolean(overridesCanal.ver_canal)
            : overridesCategoria !== undefined
              ? Boolean(overridesCategoria.ver_canal)
              : false
        if (!verCanal) hidden.add(channel.id)
      }
      setState({ loaded: true, hidden })
    }

    cargar()

    const channel = supabase
      .channel(`acceso-canales-${servidorId}-${userId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permisos_canal_rol' },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'miembros_servidor', filter: `usuario_id=eq.${userId}` },
        () => cargar()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'roles_servidor', filter: `servidor_id=eq.${servidorId}` },
        () => cargar()
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [server?.id, server?.ownerId, userId, isOwner, allChannelIds, allChannels])

  if (isOwner) return EMPTY_SET
  return state.loaded ? state.hidden : loadingHidden
}
