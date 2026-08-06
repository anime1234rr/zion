import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'

import {
  CATEGORIAS_PERMISOS,
  PERMISOS_CONOCIDOS,
  ROLE_PRESETS,
  actualizarRol,
  crearRol,
  eliminarRol,
  type ServerRole,
} from '@/lib/members'
import { cn, getErrorMessage } from '@/lib/utils'
import { COLORES } from '@/lib/role-colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface RoleEditorPanelProps {
  servidorId: string
  role: ServerRole | null
  memberCount: number
  canEdit: boolean
  nextPosicion: number
  onClose: () => void
  onSaved: (role: ServerRole) => void
  onDeleted: (roleId: string) => void
}

export function RoleEditorPanel(props: RoleEditorPanelProps) {
  return (
    <RoleEditorPanelInner
      key={props.role ? props.role.id : 'nuevo'}
      {...props}
    />
  )
}

function RoleEditorPanelInner({
  servidorId,
  role,
  memberCount,
  canEdit,
  nextPosicion,
  onClose,
  onSaved,
  onDeleted,
}: RoleEditorPanelProps) {
  const [nombre, setNombre] = useState(role?.nombre ?? 'nuevo rol')
  const [color, setColor] = useState(role?.color ?? COLORES[0])
  const [permisos, setPermisos] = useState<Record<string, boolean>>(
    role?.permisos ?? {}
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function togglePermiso(key: string, checked: boolean) {
    setPermisos((prev) => ({ ...prev, [key]: checked }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim()) return

    setLoading(true)
    setError(null)
    try {
      const saved = role
        ? await actualizarRol(role.id, { nombre, color, permisos })
        : await crearRol(servidorId, nombre, color, permisos, nextPosicion)
      onSaved(saved)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!role) return
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await eliminarRol(role.id)
      onDeleted(role.id)
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col overflow-y-auto rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {role ? 'Configurando rol' : 'Nuevo rol'}
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-foreground">
            {nombre.trim() || 'Sin nombre'}
          </h2>
          {role && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar editor"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" />
        </button>
      </div>

      {!role && (
        <div className="mt-5 flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground uppercase">
            Empezar desde una plantilla (opcional)
          </Label>
          <div className="flex flex-wrap gap-2">
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setNombre(preset.nombre)
                  setColor(preset.color)
                  setPermisos(preset.permisos)
                }}
                disabled={!canEdit}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: preset.color }}
                />
                {preset.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-1.5">
        <Label htmlFor="nombre_rol" className="text-xs text-muted-foreground uppercase">
          Identidad
        </Label>
        <Input
          id="nombre_rol"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          placeholder="nuevo rol"
          required
          disabled={!canEdit}
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase">
          Color del rol
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              disabled={!canEdit}
              aria-label={c}
              aria-pressed={color === c}
              className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              style={{ backgroundColor: c }}
            >
              {color.toLowerCase() === c.toLowerCase() && (
                <Check className="size-3.5 text-white" strokeWidth={3} />
              )}
            </button>
          ))}

          <label className="relative flex size-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:border-solid hover:text-foreground has-disabled:pointer-events-none has-disabled:opacity-40">
            <Plus className="size-3.5" />
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              disabled={!canEdit}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="Elegir color personalizado"
            />
          </label>

          <Input
            value={color}
            onChange={(event) => setColor(event.target.value)}
            disabled={!canEdit}
            className="h-7 w-24 font-mono text-xs"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Label className="text-xs text-muted-foreground uppercase">
          Permisos
        </Label>
        {CATEGORIAS_PERMISOS.map((categoria) => {
          const permisosDeCategoria = PERMISOS_CONOCIDOS.filter(
            (p) => p.categoria === categoria.id && p.enforced
          )
          if (permisosDeCategoria.length === 0) return null

          return (
            <div
              key={categoria.id}
              className="rounded-lg border border-border p-3"
            >
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <span aria-hidden>{categoria.icon}</span>
                {categoria.label}
              </p>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {permisosDeCategoria.map((permiso) => (
                  <div
                    key={permiso.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-muted-foreground">
                      {permiso.label}
                    </span>
                    <Switch
                      checked={Boolean(permisos[permiso.key])}
                      onCheckedChange={(checked) =>
                        togglePermiso(permiso.key, checked)
                      }
                      disabled={!canEdit}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!canEdit && (
        <p className="mt-3 text-xs text-muted-foreground">
          Solo podés ver este rol — no tenés permiso para modificar roles en este servidor.
        </p>
      )}

      {canEdit && (
        <div
          className={cn(
            'mt-5 flex items-center gap-3',
            role ? 'justify-between' : 'justify-end'
          )}
        >
          {role && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="text-sm text-destructive outline-none hover:underline focus-visible:underline"
            >
              {confirmingDelete ? '¿Confirmar eliminación?' : 'Eliminar rol'}
            </button>
          )}
          <Button type="submit" disabled={loading || !nombre.trim()}>
            {loading ? 'Guardando…' : role ? 'Guardar cambios' : 'Crear rol'}
          </Button>
        </div>
      )}
    </form>
  )
}
