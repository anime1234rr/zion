import { useEffect, useState } from 'react'
import { Code2, Hash, Megaphone, Volume2 } from 'lucide-react'

import {
  actualizarCanal,
  actualizarPermisosDeCanal,
  eliminarCanal,
  eliminarPermisosDeCanal,
  listarPermisosDeCanal,
  PERMISOS_CANAL_CONOCIDOS,
  type ChannelRolePermisos,
} from '@/lib/channels'
import { listarRolesDeServidor, type ServerRole } from '@/lib/members'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChannelItem, ChannelType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const tipos: { type: ChannelType; label: string; icon: typeof Hash }[] = [
  { type: 'text', label: 'Texto', icon: Hash },
  { type: 'voice', label: 'Voz', icon: Volume2 },
  { type: 'code', label: 'Código', icon: Code2 },
  { type: 'announcement', label: 'Anuncios', icon: Megaphone },
]

interface ChannelSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servidorId: string
  channel: ChannelItem | null
  onUpdated: (channel: ChannelItem) => void
  onDeleted: (channelId: string) => void
}

export function ChannelSettingsDialog({
  open,
  onOpenChange,
  servidorId,
  channel,
  onUpdated,
  onDeleted,
}: ChannelSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {channel && (
          <ChannelSettingsForm
            key={channel.id}
            servidorId={servidorId}
            channel={channel}
            onOpenChange={onOpenChange}
            onUpdated={onUpdated}
            onDeleted={onDeleted}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type Tab = 'resumen' | 'permisos'

function ChannelSettingsForm({
  servidorId,
  channel,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  servidorId: string
  channel: ChannelItem
  onOpenChange: (open: boolean) => void
  onUpdated: (channel: ChannelItem) => void
  onDeleted: (channelId: string) => void
}) {
  const [tab, setTab] = useState<Tab>('resumen')
  const [nombre, setNombre] = useState(channel.name)
  const [tipo, setTipo] = useState<ChannelType>(channel.type)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const dirty = nombre.trim() !== channel.name || tipo !== channel.type

  async function handleGuardar(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim() || !dirty) return

    setLoading(true)
    setError(null)
    try {
      const actualizado = await actualizarCanal(servidorId, channel.id, {
        nombre: nombre.trim(),
        tipo,
      })
      onUpdated(actualizado)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminar() {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }

    setLoading(true)
    setError(null)
    try {
      await eliminarCanal(servidorId, channel.id)
      onDeleted(channel.id)
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle># {channel.name}</DialogTitle>
        <DialogDescription>
          Solo propietarios y administradores pueden gestionar canales.
        </DialogDescription>
      </DialogHeader>

      <div className="flex gap-1 border-b border-border">
        {(
          [
            ['resumen', 'Resumen'],
            ['permisos', 'Permisos'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground outline-none hover:text-foreground',
              tab === id && 'border-primary font-medium text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {tab === 'resumen' && (
        <form onSubmit={handleGuardar} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo de canal</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {tipos.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTipo(type)}
                  aria-pressed={tipo === type}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border border-border py-2 text-xs text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                    tipo === type && 'border-primary bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre_canal_editar">Nombre del canal</Label>
            <Input
              id="nombre_canal_editar"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button
              type="button"
              variant={confirmingDelete ? 'destructive' : 'outline'}
              onClick={handleEliminar}
              disabled={loading}
            >
              {confirmingDelete ? '¿Seguro? Click de nuevo' : 'Eliminar canal'}
            </Button>
            <Button type="submit" disabled={loading || !nombre.trim() || !dirty}>
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      )}

      {tab === 'permisos' && (
        <CanalPermisosEditor
          servidorId={servidorId}
          canalId={channel.id}
          canalTipo={channel.type}
          categoriaId={channel.categoryId}
        />
      )}
    </>
  )
}

export function CanalPermisosEditor({
  servidorId,
  canalId,
  canalTipo,
  categoriaId,
}: {
  servidorId: string
  canalId: string
  canalTipo: ChannelType | 'categoria'
  categoriaId?: string | null
}) {
  const [roles, setRoles] = useState<ServerRole[]>([])
  const [permisosCanal, setPermisosCanal] = useState<ChannelRolePermisos[]>([])
  const [permisosCategoria, setPermisosCategoria] = useState<ChannelRolePermisos[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    Promise.all([
      listarRolesDeServidor(servidorId),
      listarPermisosDeCanal(canalId),
      categoriaId ? listarPermisosDeCanal(categoriaId) : Promise.resolve([]),
    ])
      .then(([r, p, pc]) => {
        if (cancelado) return
        setRoles(r)
        setPermisosCanal(p)
        setPermisosCategoria(pc)
        setSelectedRoleId((prev) => prev ?? r[0]?.id ?? null)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [servidorId, canalId, categoriaId])

  const filaPropia = permisosCanal.find((p) => p.rolId === selectedRoleId)
  const tieneFilaPropia = filaPropia !== undefined
  const propiosDelRol = filaPropia?.permisos ?? {}
  const heredadosDelRol =
    permisosCategoria.find((p) => p.rolId === selectedRoleId)?.permisos ?? {}

  async function handleToggle(permisoKey: string, checked: boolean) {
    if (!selectedRoleId) return
    setActionError(null)
    const anterior = permisosCanal
    const siguiente = { ...propiosDelRol, [permisoKey]: checked }

    setPermisosCanal((prev) => {
      const existe = prev.some((p) => p.rolId === selectedRoleId)
      if (existe) {
        return prev.map((p) =>
          p.rolId === selectedRoleId ? { ...p, permisos: siguiente } : p
        )
      }
      return [
        ...prev,
        { id: 'temp', canalId, rolId: selectedRoleId, permisos: siguiente },
      ]
    })

    try {
      const guardado = await actualizarPermisosDeCanal(canalId, selectedRoleId, siguiente)
      setPermisosCanal((prev) =>
        prev.map((p) => (p.rolId === selectedRoleId ? guardado : p))
      )
    } catch (err) {
      setPermisosCanal(anterior)
      setActionError(getErrorMessage(err))
    }
  }

  async function handleRestablecer() {
    if (!selectedRoleId) return
    setActionError(null)
    const anterior = permisosCanal
    setPermisosCanal((prev) => prev.filter((p) => p.rolId !== selectedRoleId))

    try {
      await eliminarPermisosDeCanal(canalId, selectedRoleId)
    } catch (err) {
      setPermisosCanal(anterior)
      setActionError(getErrorMessage(err))
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>
  }
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    )
  }
  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este servidor todavía no tiene roles. Creá uno en Personas &gt; Roles
        para poder configurar permisos por canal.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-[160px_1fr] gap-4">
      <div className="flex flex-col gap-1">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelectedRoleId(role.id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground outline-none hover:bg-muted/50',
              selectedRoleId === role.id && 'bg-muted/70 text-foreground'
            )}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: role.color ?? '#9ca3af' }}
            />
            <span className="truncate">{role.nombre}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/70">
            {canalTipo === 'categoria'
              ? 'Sin una excepción explícita acá, un rol no tiene este permiso en esta categoría. Los canales heredan lo que configures acá salvo que lo personalicen.'
              : categoriaId
                ? 'Al tocar cualquier interruptor, este canal deja de heredar de la categoría para este rol: todo lo que no actives acá queda denegado.'
                : 'Sin una excepción explícita acá, un rol no tiene este permiso en este canal.'}
          </p>
          {categoriaId && tieneFilaPropia && (
            <Button type="button" variant="outline" size="sm" onClick={handleRestablecer}>
              Restablecer a la categoría
            </Button>
          )}
        </div>

        {categoriaId && !tieneFilaPropia && canalTipo !== 'categoria' && (
          <p className="text-xs text-muted-foreground/60">
            Este canal hereda todos los permisos de su categoría. Activá cualquier interruptor
            para personalizarlo.
          </p>
        )}

        {actionError && (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {PERMISOS_CANAL_CONOCIDOS.filter(
            (permiso) =>
              permiso.enforced && (canalTipo === 'categoria' || permiso.tipos.includes(canalTipo))
          ).map((permiso) => {
            const efectivo = tieneFilaPropia
              ? Boolean(propiosDelRol[permiso.key])
              : Boolean(heredadosDelRol[permiso.key])
            return (
              <div key={permiso.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{permiso.label}</span>
                <Switch
                  checked={efectivo}
                  onCheckedChange={(checked) => handleToggle(permiso.key, checked)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
