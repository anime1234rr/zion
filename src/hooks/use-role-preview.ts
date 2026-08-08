import { useEffect, useState } from 'react'

import { listarCanales, listarPermisosDeRolEnCanales } from '@/lib/channels'
import { getErrorMessage } from '@/lib/utils'
import type { ChannelCategory } from '@/lib/types'
import type { ServerRole } from '@/lib/members'

export interface ChannelPreviewPermissions {
  canView: boolean
  canSendMessages: boolean
  canSendFiles: boolean
  canReact: boolean
  canMentionEveryone: boolean
  canUseExternalLinks: boolean
  canConnectVoice: boolean
  canSpeakVoice: boolean
}

function resolve(
  overridesCanal: Record<string, boolean> | undefined,
  overridesCategoria: Record<string, boolean> | undefined,
  generales: Record<string, boolean>,
  key: string,
  fallbackKey?: string
): boolean {
  if (overridesCanal !== undefined) return Boolean(overridesCanal[key])
  if (overridesCategoria !== undefined) return Boolean(overridesCategoria[key])
  if (fallbackKey && fallbackKey in generales) return Boolean(generales[fallbackKey])
  return false
}

export function isChannelRestricted(permissions: ChannelPreviewPermissions): boolean {
  return !permissions.canView
}

export function resolvePreviewPermission(
  role: ServerRole | null | undefined,
  permiso: string
): boolean {
  if (!role) return false
  return Boolean(role.permisos.todo || role.permisos.admin || role.permisos[permiso])
}

const ACCESO_TOTAL: ChannelPreviewPermissions = {
  canView: true,
  canSendMessages: true,
  canSendFiles: true,
  canReact: true,
  canMentionEveryone: true,
  canUseExternalLinks: true,
  canConnectVoice: true,
  canSpeakVoice: true,
}

export const ACCESO_DENEGADO: ChannelPreviewPermissions = {
  canView: false,
  canSendMessages: false,
  canSendFiles: false,
  canReact: false,
  canMentionEveryone: false,
  canUseExternalLinks: false,
  canConnectVoice: false,
  canSpeakVoice: false,
}

export function useRolePreview(servidorId: string, role: ServerRole | null) {
  const [loadedRoleId, setLoadedRoleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ChannelCategory[]>([])
  const [permissionsByChannel, setPermissionsByChannel] = useState<
    Record<string, ChannelPreviewPermissions>
  >({})

  const esAdmin = Boolean(role?.permisos.todo || role?.permisos.admin)

  useEffect(() => {
    if (!role) return

    let cancelado = false

    Promise.all([listarCanales(servidorId), listarPermisosDeRolEnCanales(role.id)])
      .then(([categorias, overridesList]) => {
        if (cancelado) return
        setError(null)
        setCategories(categorias)

        const overridesByChannel = new Map(overridesList.map((o) => [o.canalId, o.permisos]))
        const result: Record<string, ChannelPreviewPermissions> = {}

        for (const categoria of categorias) {
          for (const canal of categoria.channels) {
            if (esAdmin) {
              result[canal.id] = ACCESO_TOTAL
              continue
            }
            const overridesCategoria = canal.categoryId
              ? overridesByChannel.get(canal.categoryId)
              : undefined
            const overridesCanal = overridesByChannel.get(canal.id)
            result[canal.id] = {
              canView: resolve(overridesCanal, overridesCategoria, role.permisos, 'ver_canal'),
              canSendMessages: resolve(
                overridesCanal,
                overridesCategoria,
                role.permisos,
                'enviar_mensajes',
                'enviar_mensajes'
              ),
              canSendFiles: resolve(overridesCanal, overridesCategoria, role.permisos, 'enviar_archivos'),
              canReact: resolve(overridesCanal, overridesCategoria, role.permisos, 'anadir_reacciones'),
              canMentionEveryone: resolve(
                overridesCanal,
                overridesCategoria,
                role.permisos,
                'mencionar_todos',
                'mencionar_todos'
              ),
              canUseExternalLinks: resolve(
                overridesCanal,
                overridesCategoria,
                role.permisos,
                'usar_enlaces_externos'
              ),
              canConnectVoice: resolve(
                overridesCanal,
                overridesCategoria,
                role.permisos,
                'conectar_canal_voz',
                'conectar_voz'
              ),
              canSpeakVoice: resolve(
                overridesCanal,
                overridesCategoria,
                role.permisos,
                'hablar_voz',
                'transmitir_voz'
              ),
            }
          }
        }

        setPermissionsByChannel(result)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoadedRoleId(role.id))

    return () => {
      cancelado = true
    }
  }, [servidorId, role?.id, role?.permisos, esAdmin])

  return {
    loading: role != null && loadedRoleId !== role.id,
    error: role ? error : null,
    categories: role ? categories : [],
    permissionsByChannel: role ? permissionsByChannel : {},
    esAdmin,
  }
}
