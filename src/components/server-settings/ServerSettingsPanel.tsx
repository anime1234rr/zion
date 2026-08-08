import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Blocks,
  Crown,
  Hash,
  Info,
  LayoutTemplate,
  ScrollText,
  Rocket,
  ShieldCheck,
  Smile,
  Users,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useServerPermissions } from '@/hooks/use-server-permissions'
import type { ServerItem } from '@/lib/types'
import type { ServerRole } from '@/lib/members'
import { GeneralSection } from '@/components/server-settings/GeneralSection'
import { PersonasSection } from '@/components/server-settings/PersonasSection'
import { RolesPermisosSection } from '@/components/server-settings/RolesPermisosSection'
import { CanalesEstructuraSection } from '@/components/server-settings/CanalesEstructuraSection'
import { VerificacionSection } from '@/components/server-settings/VerificacionSection'
import { WebhooksSection } from '@/components/server-settings/WebhooksSection'
import { ExpresionesSection } from '@/components/server-settings/ExpresionesSection'
import { PlantillaSection } from '@/components/server-settings/PlantillaSection'
import { ComingSoonSection } from '@/components/server-settings/ComingSoonSection'
import { AuditLogSection } from '@/components/server-settings/AuditLogSection'
import { DangerZoneSection } from '@/components/server-settings/DangerZoneSection'
import { AppBackgroundLayer } from '@/components/AppBackgroundLayer'

type SectionId =
  | 'general'
  | 'expresiones'
  | 'personas'
  | 'roles-permisos'
  | 'canales-estructura'
  | 'apps'
  | 'moderacion'
  | 'auditoria'
  | 'comunidad'
  | 'plantilla'
  | 'zona-peligro'

const sections: {
  id: SectionId
  label: string
  icon: typeof Info
  group: number
}[] = [
  { id: 'general', label: 'Resumen', icon: Info, group: 0 },
  { id: 'expresiones', label: 'Expresiones', icon: Smile, group: 1 },
  { id: 'personas', label: 'Personas', icon: Users, group: 1 },
  { id: 'roles-permisos', label: 'Roles y Permisos', icon: Crown, group: 1 },
  { id: 'canales-estructura', label: 'Canales y Estructura', icon: Hash, group: 1 },
  { id: 'apps', label: 'Apps', icon: Blocks, group: 1 },
  { id: 'moderacion', label: 'Moderación', icon: ShieldCheck, group: 1 },
  { id: 'auditoria', label: 'Auditoría', icon: ScrollText, group: 1 },
  { id: 'comunidad', label: 'Activar comunidad', icon: Rocket, group: 2 },
  { id: 'plantilla', label: 'Plantilla', icon: LayoutTemplate, group: 2 },
  { id: 'zona-peligro', label: 'Zona de peligro', icon: AlertTriangle, group: 2 },
]

interface ServerSettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: ServerItem
  currentUserId: string
  backgroundUrl?: string
  backgroundType?: 'imagen' | 'video'
  onServerUpdated: (server: ServerItem) => void
  onServerDeleted?: (serverId: string) => void
  onPreviewAsRole?: (role: ServerRole) => void
}

export function ServerSettingsPanel({
  open,
  onOpenChange,
  server,
  currentUserId,
  backgroundUrl,
  backgroundType,
  onServerUpdated,
  onServerDeleted,
  onPreviewAsRole,
}: ServerSettingsPanelProps) {
  const { hasPermission, isOwner } = useServerPermissions(server, currentUserId)
  const [active, setActive] = useState<SectionId>('general')

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className={cn(
        'isolate fixed inset-0 z-50 flex bg-background',
        backgroundUrl ? 'has-app-background' : 'surface-opaque'
      )}
      role="dialog"
      aria-modal
    >
      <AppBackgroundLayer url={backgroundUrl} type={backgroundType} />
      <nav className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 py-6">
        <div className="px-2">
          <p className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {server.name}
          </p>
        </div>

        {[0, 1, 2].map((group) => (
          <div key={group} className="flex flex-col gap-0.5 border-t border-sidebar-border pt-3 first:border-t-0 first:pt-0">
            {sections
              .filter((section) => section.group === group)
              .filter((section) => section.id !== 'zona-peligro' || isOwner)
              .filter((section) => section.id !== 'auditoria' || isOwner || hasPermission('ver_registros'))
              .filter(
                (section) => section.id !== 'roles-permisos' || isOwner || hasPermission('gestionar_roles')
              )
              .map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  aria-current={active === section.id}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground outline-none transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                    active === section.id &&
                      'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  )}
                >
                  <section.icon className="size-4 shrink-0" />
                  {section.label}
                </button>
              ))}
          </div>
        ))}
      </nav>

      <div className="relative flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar configuración"
          className="absolute top-6 right-6 flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" />
        </button>

        <div className="px-10 py-10">
          {active === 'general' && (
            <GeneralSection
              server={server}
              canEdit={hasPermission('gestionar_servidor')}
              canManageInvites={isOwner || hasPermission('gestionar_invitaciones')}
              onUpdated={onServerUpdated}
            />
          )}
          {active === 'personas' && (
            <PersonasSection server={server} currentUserId={currentUserId} />
          )}
          {active === 'roles-permisos' && (isOwner || hasPermission('gestionar_roles')) && (
            <RolesPermisosSection
              server={server}
              currentUserId={currentUserId}
              onPreviewAsRole={onPreviewAsRole}
            />
          )}
          {active === 'canales-estructura' && (
            <CanalesEstructuraSection
              server={server}
              canEdit={hasPermission('gestionar_servidor')}
              onUpdated={onServerUpdated}
            />
          )}
          {active === 'plantilla' && (
            <PlantillaSection serverName={server.name} />
          )}
          {active === 'expresiones' && (
            <ExpresionesSection server={server} canEdit={hasPermission('gestionar_servidor')} />
          )}
          {active === 'apps' && (
            <WebhooksSection server={server} canEdit={hasPermission('gestionar_servidor')} />
          )}
          {active === 'moderacion' && (
            <VerificacionSection
              server={server}
              canEdit={hasPermission('gestionar_servidor')}
              onUpdated={onServerUpdated}
            />
          )}
          {active === 'auditoria' && (isOwner || hasPermission('ver_registros')) && (
            <AuditLogSection key={server.id} server={server} />
          )}
          {active === 'comunidad' && (
            <ComingSoonSection
              icon={Rocket}
              title="Activar comunidad"
              description="Convertir este servidor en un espacio público y estructurado (con canales de reglas y anuncios verificados) todavía no está disponible."
            />
          )}
          {active === 'zona-peligro' && isOwner && (
            <DangerZoneSection
              server={server}
              currentUserId={currentUserId}
              onServerUpdated={onServerUpdated}
              onServerDeleted={(serverId) => {
                onOpenChange(false)
                onServerDeleted?.(serverId)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
