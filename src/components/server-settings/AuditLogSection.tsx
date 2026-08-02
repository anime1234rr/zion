import { useEffect, useState } from 'react'
import {
  Ban,
  Hash,
  MessageSquareWarning,
  Shield,
  ShieldOff,
  UserCog,
  UserMinus,
  VolumeX,
  Volume2 as VolumeOn,
} from 'lucide-react'

import { listarRegistroAuditoria, type AuditLogAction, type AuditLogEntry } from '@/lib/audit-log'
import { formatTimestamp } from '@/lib/message-format'
import { getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface AuditLogSectionProps {
  server: ServerItem
}

const ICONOS: Record<AuditLogAction, typeof Shield> = {
  rol_creado: Shield,
  rol_actualizado: Shield,
  rol_eliminado: ShieldOff,
  canal_creado: Hash,
  canal_actualizado: Hash,
  canal_eliminado: Hash,
  miembro_rol_cambiado: UserCog,
  miembro_silenciado: VolumeX,
  miembro_desilenciado: VolumeOn,
  miembro_expulsado: UserMinus,
  miembro_advertido: MessageSquareWarning,
  baneo_creado: Ban,
  baneo_actualizado: Ban,
  baneo_eliminado: Ban,
}

function nombreDe(actor: AuditLogEntry['actor']): string {
  return actor?.name ?? 'Alguien'
}

function describirEntrada(entry: AuditLogEntry): string {
  const actor = nombreDe(entry.actor)
  const objetivo = entry.objetivo?.name
  const d = entry.detalle as Record<string, unknown>

  switch (entry.accion) {
    case 'rol_creado':
      return `${actor} creó el rol "${d.nombre}".`
    case 'rol_actualizado':
      if (d.nombre_anterior !== d.nombre_nuevo) {
        return `${actor} renombró el rol "${d.nombre_anterior}" a "${d.nombre_nuevo}".`
      }
      if (d.permisos_cambiaron) {
        return `${actor} cambió los permisos del rol "${d.nombre_nuevo}".`
      }
      return `${actor} cambió el color del rol "${d.nombre_nuevo}".`
    case 'rol_eliminado':
      return `${actor} eliminó el rol "${d.nombre}".`
    case 'canal_creado':
      return `${actor} creó el canal "${d.nombre}".`
    case 'canal_actualizado':
      if (d.nombre_anterior !== d.nombre_nuevo) {
        return `${actor} renombró el canal "${d.nombre_anterior}" a "${d.nombre_nuevo}".`
      }
      if (d.tipo_anterior !== d.tipo_nuevo) {
        return `${actor} cambió el tipo del canal "${d.nombre_nuevo}".`
      }
      return `${actor} cambió la configuración del canal "${d.nombre_nuevo}".`
    case 'canal_eliminado':
      return `${actor} eliminó el canal "${d.nombre}".`
    case 'miembro_rol_cambiado':
      return `${actor} le asignó el rol "${d.rol_nuevo_nombre ?? 'sin rol'}" a ${objetivo ?? 'un miembro'}.`
    case 'miembro_silenciado':
      return `${actor} silenció a ${objetivo ?? 'un miembro'}${d.hasta ? ` hasta ${formatTimestamp(d.hasta as string)}` : ''}.`
    case 'miembro_desilenciado':
      return `${actor} le quitó el silencio a ${objetivo ?? 'un miembro'}.`
    case 'miembro_expulsado':
      return `${actor} expulsó a ${objetivo ?? 'un miembro'}.`
    case 'miembro_advertido':
      return `${actor} advirtió a ${objetivo ?? 'un miembro'}${d.razon ? `: "${d.razon}"` : '.'}`
    case 'baneo_creado':
      return `${actor} baneó a ${objetivo ?? 'un miembro'}${d.expira_at ? ` hasta ${formatTimestamp(d.expira_at as string)}` : ' de forma permanente'}${d.razon ? ` — "${d.razon}"` : ''}.`
    case 'baneo_actualizado':
      return `${actor} actualizó el baneo de ${objetivo ?? 'un miembro'}.`
    case 'baneo_eliminado':
      return `${actor} desbaneó a ${objetivo ?? 'un miembro'}.`
    default:
      return `${actor} realizó una acción.`
  }
}

export function AuditLogSection({ server }: AuditLogSectionProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarRegistroAuditoria(server.id)
      .then((data) => {
        if (cancelado) return
        setEntries(data)
        setHasMore(data.length >= 50)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [server.id])

  async function cargarMas() {
    const ultima = entries[entries.length - 1]
    if (!ultima) return
    setLoadingMore(true)
    setError(null)
    try {
      const data = await listarRegistroAuditoria(server.id, ultima.creadoAt)
      setEntries((prev) => [...prev, ...data])
      setHasMore(data.length >= 50)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Registro de auditoría</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Roles, canales, baneos y otras acciones de staff en {server.name}.
      </p>

      {loading && <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>}
      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>
      )}

      {!loading && entries.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          {entries.map((entry) => {
            const Icon = ICONOS[entry.accion] ?? Shield
            return (
              <div key={entry.id} className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/50">
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{describirEntrada(entry)}</p>
                  <p className="text-xs text-muted-foreground">{formatTimestamp(entry.creadoAt)}</p>
                </div>
                {entry.actor && (
                  <Avatar size="sm" className="mt-0.5 shrink-0">
                    {entry.actor.avatarUrl && <AvatarImage src={entry.actor.avatarUrl} />}
                    <AvatarFallback>{entry.actor.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            )
          })}

          {hasMore && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 self-center"
              onClick={cargarMas}
              disabled={loadingMore}
            >
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
