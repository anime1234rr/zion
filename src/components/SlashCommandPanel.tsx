import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'

import {
  advertirMiembroRapido,
  asignarRolRapido,
  banearMiembroRapido,
  banearMiembroTemporalRapido,
  cambiarColorRolRapido,
  crearRolRapido,
  kickearMiembroRapido,
  listarRolesDeServidor,
  renombrarRolRapido,
  silenciarMiembroRapido,
  type ServerRole,
} from '@/lib/members'
import { limpiarMensajesRapido } from '@/lib/messages'
import { buscarUsuariosEnServidor } from '@/lib/search'
import { COLORES } from '@/lib/role-colors'
import { DURACIONES_MUTE, DURACIONES_TEMPBAN, SLASH_COMANDOS, type SlashCommandStep } from '@/lib/slash-commands'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChannelItem, ChatUser, ServerItem } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SlashCommandPanelProps {
  server: ServerItem
  channel: ChannelItem
  currentUserId: string
  isOwner: boolean
  hasPermission: (permiso: string) => boolean
  onClose: () => void
}

type Step = 'lista' | SlashCommandStep

function RolePicker({
  roles,
  selected,
  onSelect,
}: {
  roles: ServerRole[]
  selected: ServerRole | null
  onSelect: (role: ServerRole) => void
}) {
  if (roles.length === 0) {
    return <p className="text-sm text-muted-foreground">Este servidor todavía no tiene roles.</p>
  }
  return (
    <div className="flex flex-col gap-0.5">
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onSelect(role)}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted',
            selected?.id === role.id && 'bg-muted'
          )}
        >
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: role.color ?? '#9ca3af' }} />
          <span className="truncate text-foreground">{role.nombre}</span>
        </button>
      ))}
    </div>
  )
}

function UserPicker({
  server,
  excludeUserId,
  placeholder = 'Buscar miembro por nombre…',
  onSelect,
}: {
  server: ServerItem
  excludeUserId?: string
  placeholder?: string
  onSelect: (user: ChatUser) => void
}) {
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState<ChatUser[]>([])

  useEffect(() => {
    if (!query.trim()) return
    let cancelado = false
    const timeout = setTimeout(() => {
      buscarUsuariosEnServidor(server.id, query)
        .then(
          (results) =>
            !cancelado &&
            setSugerencias(results.filter((u) => u.id !== server.ownerId && u.id !== excludeUserId))
        )
        .catch(() => !cancelado && setSugerencias([]))
    }, 200)
    return () => {
      cancelado = true
      clearTimeout(timeout)
    }
  }, [query, server.id, server.ownerId, excludeUserId])

  const visibles = query.trim() ? sugerencias : []

  return (
    <div className="flex flex-col gap-1.5">
      <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="h-8" />
      {visibles.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {visibles.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
            >
              <Avatar size="sm">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate text-foreground">{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SelectedUserRow({ user }: { user: ChatUser }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Avatar size="sm" className="shrink-0">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
        <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{user.name}</span>
    </div>
  )
}

export function SlashCommandPanel({
  server,
  channel,
  currentUserId,
  isOwner,
  hasPermission,
  onClose,
}: SlashCommandPanelProps) {
  const [step, setStep] = useState<Step>('lista')
  const [roles, setRoles] = useState<ServerRole[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [nombreCrear, setNombreCrear] = useState('')

  const [rolRenombrar, setRolRenombrar] = useState<ServerRole | null>(null)
  const [nombreNuevo, setNombreNuevo] = useState('')

  const [rolColor, setRolColor] = useState<ServerRole | null>(null)
  const [colorElegido, setColorElegido] = useState(COLORES[0])

  const [rolAsignar, setRolAsignar] = useState<ServerRole | null>(null)
  const [usuarioAsignar, setUsuarioAsignar] = useState<ChatUser | null>(null)

  const [usuarioModerado, setUsuarioModerado] = useState<ChatUser | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [razon, setRazon] = useState('')
  const [minutos, setMinutos] = useState<number | null>(null)

  const [cantidadLimpiar, setCantidadLimpiar] = useState('25')
  const [confirmandoLimpiar, setConfirmandoLimpiar] = useState(false)

  const nombreCrearRef = useRef<HTMLInputElement>(null)

  const comandosVisibles = SLASH_COMANDOS.filter((c) => isOwner || hasPermission(c.permiso))

  useEffect(() => {
    let cancelado = false
    listarRolesDeServidor(server.id)
      .then((data) => !cancelado && setRoles(data))
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [server.id])

  useEffect(() => {
    if (step === 'crear') nombreCrearRef.current?.focus()
  }, [step])

  function volverALista() {
    setStep('lista')
    setError(null)
    setFeedback(null)
    setNombreCrear('')
    setRolRenombrar(null)
    setNombreNuevo('')
    setRolColor(null)
    setRolAsignar(null)
    setUsuarioAsignar(null)
    setUsuarioModerado(null)
    setConfirmando(false)
    setRazon('')
    setMinutos(null)
    setCantidadLimpiar('25')
    setConfirmandoLimpiar(false)
  }

  async function handleCrear(event: React.FormEvent) {
    event.preventDefault()
    if (!nombreCrear.trim()) return
    setLoading(true)
    setError(null)
    try {
      const rol = await crearRolRapido(server.id, nombreCrear)
      setRoles((prev) => [...prev, rol])
      setFeedback(`Se creó el rol "${rol.nombre}".`)
      setNombreCrear('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleRenombrar(event: React.FormEvent) {
    event.preventDefault()
    if (!rolRenombrar || !nombreNuevo.trim()) return
    setLoading(true)
    setError(null)
    try {
      const rol = await renombrarRolRapido(server.id, rolRenombrar.id, nombreNuevo)
      setRoles((prev) => prev.map((r) => (r.id === rol.id ? rol : r)))
      setFeedback(`Se renombró el rol a "${rol.nombre}".`)
      setRolRenombrar(null)
      setNombreNuevo('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleColor() {
    if (!rolColor) return
    setLoading(true)
    setError(null)
    try {
      const rol = await cambiarColorRolRapido(server.id, rolColor.id, colorElegido)
      setRoles((prev) => prev.map((r) => (r.id === rol.id ? rol : r)))
      setFeedback(`Se cambió el color de "${rol.nombre}".`)
      setRolColor(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleAsignar() {
    if (!rolAsignar || !usuarioAsignar) return
    setLoading(true)
    setError(null)
    try {
      await asignarRolRapido(server.id, usuarioAsignar.id, rolAsignar.id)
      setFeedback(`Se asignó el rol "${rolAsignar.nombre}" a ${usuarioAsignar.name}.`)
      setRolAsignar(null)
      setUsuarioAsignar(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleKick() {
    if (!usuarioModerado) return
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await kickearMiembroRapido(server.id, usuarioModerado.id)
      setFeedback(`Se expulsó a ${usuarioModerado.name}.`)
      setUsuarioModerado(null)
      setConfirmando(false)
    } catch (err) {
      setError(getErrorMessage(err))
      setConfirmando(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleBan() {
    if (!usuarioModerado) return
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await banearMiembroRapido(server.id, usuarioModerado.id, razon)
      setFeedback(`Se baneó a ${usuarioModerado.name} de forma permanente.`)
      setUsuarioModerado(null)
      setConfirmando(false)
      setRazon('')
    } catch (err) {
      setError(getErrorMessage(err))
      setConfirmando(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleTempban() {
    if (!usuarioModerado || !minutos) return
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await banearMiembroTemporalRapido(server.id, usuarioModerado.id, minutos, razon)
      const preset = DURACIONES_TEMPBAN.find((d) => d.minutos === minutos)
      setFeedback(`Se baneó a ${usuarioModerado.name} por ${preset?.label ?? `${minutos} minutos`}.`)
      setUsuarioModerado(null)
      setConfirmando(false)
      setRazon('')
      setMinutos(null)
    } catch (err) {
      setError(getErrorMessage(err))
      setConfirmando(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleMute() {
    if (!usuarioModerado || !minutos) return
    setLoading(true)
    setError(null)
    try {
      await silenciarMiembroRapido(server.id, usuarioModerado.id, minutos)
      const preset = DURACIONES_MUTE.find((d) => d.minutos === minutos)
      setFeedback(`Se silenció a ${usuarioModerado.name} por ${preset?.label ?? `${minutos} minutos`}.`)
      setUsuarioModerado(null)
      setMinutos(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleWarn(event: React.FormEvent) {
    event.preventDefault()
    if (!usuarioModerado || !razon.trim()) return
    setLoading(true)
    setError(null)
    try {
      const total = await advertirMiembroRapido(server.id, usuarioModerado.id, razon)
      setFeedback(`Se advirtió a ${usuarioModerado.name}. Tiene ${total} ${total === 1 ? 'advertencia' : 'advertencias'} en total.`)
      setUsuarioModerado(null)
      setRazon('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleLimpiar() {
    const cantidad = Number.parseInt(cantidadLimpiar, 10)
    if (!Number.isFinite(cantidad) || cantidad < 1) return
    if (!confirmandoLimpiar) {
      setConfirmandoLimpiar(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const borrados = await limpiarMensajesRapido(channel.id, cantidad)
      setFeedback(`Se borraron ${borrados} ${borrados === 1 ? 'mensaje' : 'mensajes'} en #${channel.name}.`)
      setConfirmandoLimpiar(false)
    } catch (err) {
      setError(getErrorMessage(err))
      setConfirmandoLimpiar(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-1.5 flex flex-col gap-2 rounded-xl border border-border bg-popover p-3 shadow-sm">
      <div className="flex items-center gap-2">
        {step !== 'lista' && (
          <button
            type="button"
            onClick={volverALista}
            aria-label="Volver a la lista de comandos"
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground uppercase">
          {step === 'lista' ? 'Comandos de staff' : comandosVisibles.find((c) => c.step === step)?.comando}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar comandos"
          className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {feedback && !error && <p className="text-sm text-online">{feedback}</p>}

      {step === 'lista' && (
        <div className="flex flex-col gap-0.5">
          {comandosVisibles.map(({ step: s, comando, label, icon: Icon }) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setError(null)
                setFeedback(null)
                setStep(s)
              }}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-xs text-foreground">{comando}</span>
                <span className="block text-xs text-muted-foreground">{label}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 'crear' && (
        <form onSubmit={handleCrear} className="flex items-center gap-2">
          <Input
            ref={nombreCrearRef}
            value={nombreCrear}
            onChange={(event) => setNombreCrear(event.target.value)}
            placeholder="Nombre del rol nuevo"
            className="h-8"
          />
          <Button type="submit" size="sm" disabled={loading || !nombreCrear.trim()}>
            Crear
          </Button>
        </form>
      )}

      {step === 'renombrar' && (
        <div className="flex flex-col gap-2">
          {!rolRenombrar ? (
            <RolePicker roles={roles} selected={rolRenombrar} onSelect={setRolRenombrar} />
          ) : (
            <form onSubmit={handleRenombrar} className="flex items-center gap-2">
              <span className="shrink-0 truncate text-xs text-muted-foreground">{rolRenombrar.nombre} →</span>
              <Input
                autoFocus
                value={nombreNuevo}
                onChange={(event) => setNombreNuevo(event.target.value)}
                placeholder="Nuevo nombre"
                className="h-8"
              />
              <Button type="submit" size="sm" disabled={loading || !nombreNuevo.trim()}>
                Guardar
              </Button>
            </form>
          )}
        </div>
      )}

      {step === 'color' && (
        <div className="flex flex-col gap-2">
          {!rolColor ? (
            <RolePicker roles={roles} selected={rolColor} onSelect={setRolColor} />
          ) : (
            <div className="flex items-center gap-2">
              <span className="shrink-0 truncate text-xs text-muted-foreground">{rolColor.nombre}</span>
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                {COLORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorElegido(c)}
                    aria-label={c}
                    aria-pressed={colorElegido === c}
                    className={cn(
                      'size-5 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      colorElegido === c && 'ring-2 ring-foreground ring-offset-2 ring-offset-popover'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button type="button" size="sm" onClick={handleColor} disabled={loading}>
                Guardar
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 'asignar' && (
        <div className="flex flex-col gap-2">
          {!rolAsignar ? (
            <RolePicker roles={roles} selected={rolAsignar} onSelect={setRolAsignar} />
          ) : !usuarioAsignar ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Rol: {rolAsignar.nombre} — elegí un miembro</span>
              <UserPicker server={server} onSelect={setUsuarioAsignar} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SelectedUserRow user={usuarioAsignar} />
              <span className="shrink-0 text-xs text-muted-foreground">→ {rolAsignar.nombre}</span>
              <Button type="button" size="sm" onClick={handleAsignar} disabled={loading}>
                Asignar
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 'kick' && (
        <div className="flex flex-col gap-2">
          {!usuarioModerado ? (
            <UserPicker server={server} excludeUserId={currentUserId} onSelect={setUsuarioModerado} />
          ) : (
            <div className="flex items-center gap-2">
              <SelectedUserRow user={usuarioModerado} />
              <Button type="button" size="sm" variant="destructive" onClick={handleKick} disabled={loading}>
                {confirmando ? '¿Confirmar?' : 'Expulsar'}
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 'ban' && (
        <div className="flex flex-col gap-2">
          {!usuarioModerado ? (
            <UserPicker server={server} excludeUserId={currentUserId} onSelect={setUsuarioModerado} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <SelectedUserRow user={usuarioModerado} />
              <div className="flex items-center gap-2">
                <Input
                  value={razon}
                  onChange={(event) => setRazon(event.target.value)}
                  placeholder="Motivo (opcional)"
                  className="h-8"
                />
                <Button type="button" size="sm" variant="destructive" onClick={handleBan} disabled={loading}>
                  {confirmando ? '¿Confirmar?' : 'Banear'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'tempban' && (
        <div className="flex flex-col gap-2">
          {!usuarioModerado ? (
            <UserPicker server={server} excludeUserId={currentUserId} onSelect={setUsuarioModerado} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <SelectedUserRow user={usuarioModerado} />
              <div className="flex flex-wrap items-center gap-1.5">
                {DURACIONES_TEMPBAN.map((d) => (
                  <button
                    key={d.minutos}
                    type="button"
                    onClick={() => setMinutos(d.minutos)}
                    className={cn(
                      'rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
                      minutos === d.minutos && 'border-primary bg-primary/10 text-primary'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={razon}
                  onChange={(event) => setRazon(event.target.value)}
                  placeholder="Motivo (opcional)"
                  className="h-8"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleTempban}
                  disabled={loading || !minutos}
                >
                  {confirmando ? '¿Confirmar?' : 'Banear'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'mute' && (
        <div className="flex flex-col gap-2">
          {!usuarioModerado ? (
            <UserPicker server={server} onSelect={setUsuarioModerado} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <SelectedUserRow user={usuarioModerado} />
              <div className="flex flex-wrap items-center gap-1.5">
                {DURACIONES_MUTE.map((d) => (
                  <button
                    key={d.minutos}
                    type="button"
                    onClick={() => setMinutos(d.minutos)}
                    className={cn(
                      'rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
                      minutos === d.minutos && 'border-primary bg-primary/10 text-primary'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
                <Button type="button" size="sm" onClick={handleMute} disabled={loading || !minutos}>
                  Silenciar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'warn' && (
        <div className="flex flex-col gap-2">
          {!usuarioModerado ? (
            <UserPicker server={server} onSelect={setUsuarioModerado} />
          ) : (
            <form onSubmit={handleWarn} className="flex flex-col gap-1.5">
              <SelectedUserRow user={usuarioModerado} />
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={razon}
                  onChange={(event) => setRazon(event.target.value)}
                  placeholder="Motivo de la advertencia"
                  className="h-8"
                />
                <Button type="submit" size="sm" disabled={loading || !razon.trim()}>
                  Advertir
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {step === 'clear' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            Borra los últimos mensajes de <span className="font-medium">#{channel.name}</span>. No se puede deshacer.
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={100}
              value={cantidadLimpiar}
              onChange={(event) => {
                setCantidadLimpiar(event.target.value)
                setConfirmandoLimpiar(false)
              }}
              className="h-8 w-24"
            />
            <span className="text-xs text-muted-foreground">mensajes (máx. 100)</span>
            <Button type="button" size="sm" variant="destructive" onClick={handleLimpiar} disabled={loading}>
              {confirmandoLimpiar ? '¿Confirmar?' : 'Borrar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
