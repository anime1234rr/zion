import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { ServerItem } from '@/lib/types'

interface RolPermisosRow {
  permisos: Record<string, boolean> | null
}

export function useServerPermissions(server: ServerItem, userId: string | undefined) {
  const isOwner = Boolean(userId) && server.ownerId === userId
  const [permisos, setPermisos] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(!isOwner)

  useEffect(() => {
    if (isOwner || !userId) return

    let cancelado = false

    async function cargar() {
      const { data } = await supabase
        .from('miembros_servidor')
        .select('roles_servidor(permisos)')
        .eq('servidor_id', server.id)
        .eq('usuario_id', userId as string)
        .maybeSingle()

      if (cancelado) return
      const row = data?.roles_servidor as RolPermisosRow | RolPermisosRow[] | null
      const rol = Array.isArray(row) ? row[0] : row
      setPermisos(rol?.permisos ?? {})
      setLoading(false)
    }

    cargar()

    const channel = supabase
      .channel(`permisos-propios-${server.id}-${userId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'miembros_servidor',
          filter: `usuario_id=eq.${userId}`,
        },
        () => cargar()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'roles_servidor',
          filter: `servidor_id=eq.${server.id}`,
        },
        () => cargar()
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(channel)
    }
  }, [server.id, server.ownerId, userId, isOwner])

  function hasPermission(permiso: string): boolean {
    if (isOwner) return true
    return Boolean(permisos.todo || permisos.admin || permisos[permiso])
  }

  return { loading, isOwner, hasPermission }
}
