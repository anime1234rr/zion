import {
  AtSign,
  Check,
  Code2,
  Eye,
  Hash,
  Link2,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  Mic,
  Paperclip,
  PhoneCall,
  ShieldCheck,
  Smile,
  Volume2,
  X,
} from 'lucide-react'

import { CATEGORIAS_PERMISOS, PERMISOS_CONOCIDOS, type ServerRole } from '@/lib/members'
import { useRolePreview, type ChannelPreviewPermissions } from '@/hooks/use-role-preview'
import type { ChannelType } from '@/lib/types'
import { cn } from '@/lib/utils'

const channelIcon: Record<ChannelType, typeof Hash> = {
  text: Hash,
  voice: Volume2,
  code: Code2,
  announcement: Megaphone,
  forum: MessagesSquare,
}

function CapabilityBadge({
  icon: Icon,
  label,
  allowed,
}: {
  icon: typeof MessageSquare
  label: string
  allowed: boolean
}) {
  return (
    <span
      title={label}
      className={cn(
        'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        allowed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/60 line-through'
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  )
}

function ChannelPreviewRow({
  name,
  type,
  permissions,
}: {
  name: string
  type: ChannelType
  permissions: ChannelPreviewPermissions
}) {
  const Icon = channelIcon[type]

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm text-foreground">{name}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {type === 'voice' ? (
          <>
            <CapabilityBadge icon={PhoneCall} label="Conectarse" allowed={permissions.canConnectVoice} />
            <CapabilityBadge icon={Mic} label="Hablar" allowed={permissions.canSpeakVoice} />
          </>
        ) : (
          <>
            <CapabilityBadge icon={MessageSquare} label="Enviar mensajes" allowed={permissions.canSendMessages} />
            <CapabilityBadge icon={Paperclip} label="Adjuntar archivos" allowed={permissions.canSendFiles} />
            <CapabilityBadge icon={Smile} label="Reaccionar" allowed={permissions.canReact} />
            <CapabilityBadge icon={AtSign} label="Mencionar a todos" allowed={permissions.canMentionEveryone} />
            <CapabilityBadge icon={Link2} label="Enlaces externos" allowed={permissions.canUseExternalLinks} />
          </>
        )}
      </div>
    </div>
  )
}

export function RolePreviewPanel({
  servidorId,
  role,
  onPreviewAsRole,
}: {
  servidorId: string
  role: ServerRole
  onPreviewAsRole?: () => void
}) {
  const { loading, error, categories, permissionsByChannel, esAdmin } = useRolePreview(servidorId, role)

  const totalCanales = categories.reduce((total, categoria) => total + categoria.channels.length, 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Así experimenta el servidor cualquier miembro que solo tenga el rol{' '}
          <span className="font-medium text-foreground">{role.nombre}</span>.
        </p>
        {onPreviewAsRole && (
          <button
            type="button"
            onClick={onPreviewAsRole}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Eye className="size-3.5" />
            Ver servidor como este rol
          </button>
        )}
      </div>

      {esAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-primary">
          <ShieldCheck className="size-4 shrink-0" />
          Este rol es administrador: tiene acceso total en todos los canales, sin excepciones.
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Calculando vista previa…</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Canales ({totalCanales})
            </p>
            {totalCanales === 0 && (
              <p className="text-sm text-muted-foreground">Este servidor todavía no tiene canales.</p>
            )}
            {categories.map((categoria) =>
              categoria.channels.length === 0 ? null : (
                <div key={categoria.id} className="flex flex-col gap-2">
                  {categoria.name && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {categoria.name}
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {categoria.channels.map((canal) => (
                      <ChannelPreviewRow
                        key={canal.id}
                        name={canal.name}
                        type={canal.type}
                        permissions={
                          permissionsByChannel[canal.id] ?? {
                            canView: false,
                            canSendMessages: false,
                            canSendFiles: false,
                            canReact: false,
                            canMentionEveryone: false,
                            canUseExternalLinks: false,
                            canConnectVoice: false,
                            canSpeakVoice: false,
                          }
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Permisos generales</p>
            {CATEGORIAS_PERMISOS.map((categoria) => {
              const permisosDeCategoria = PERMISOS_CONOCIDOS.filter(
                (p) => p.categoria === categoria.id && p.enforced
              )
              if (permisosDeCategoria.length === 0) return null

              return (
                <div key={categoria.id} className="rounded-lg border border-border p-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span aria-hidden>{categoria.icon}</span>
                    {categoria.label}
                  </p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {permisosDeCategoria.map((permiso) => {
                      const activo = esAdmin || Boolean(role.permisos[permiso.key])
                      return (
                        <div key={permiso.key} className="flex items-center gap-2 text-sm">
                          {activo ? (
                            <Check className="size-3.5 shrink-0 text-primary" />
                          ) : (
                            <X className="size-3.5 shrink-0 text-muted-foreground/50" />
                          )}
                          <span className={activo ? 'text-foreground' : 'text-muted-foreground/70'}>
                            {permiso.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
