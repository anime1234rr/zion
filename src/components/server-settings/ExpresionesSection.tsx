import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import {
  crearExpresion,
  eliminarExpresion,
  listarExpresiones,
  renombrarExpresion,
  type ExpresionTipo,
  type ServerExpresion,
} from '@/lib/expresiones'
import { subirExpresionServidor } from '@/lib/storage'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import { Input } from '@/components/ui/input'

interface ExpresionesSectionProps {
  server: ServerItem
  canEdit: boolean
}

function nombreDesdeArchivo(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '')
  return base.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || 'expresion'
}

function ExpresionTile({
  expresion,
  canEdit,
  onRename,
  onDelete,
}: {
  expresion: ServerExpresion
  canEdit: boolean
  onRename: (id: string, nombre: string) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [nombre, setNombre] = useState(expresion.nombre)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!nombre.trim() || nombre.trim() === expresion.nombre) {
      setNombre(expresion.nombre)
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onRename(expresion.id, nombre)
      setEditing(false)
    } catch {
      setNombre(expresion.nombre)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="group/tile relative flex flex-col items-center gap-1.5 rounded-lg border border-border bg-popover p-3">
      {canEdit && (
        <button
          type="button"
          onClick={() => onDelete(expresion.id)}
          aria-label={`Eliminar ${expresion.nombre}`}
          className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-background/80 text-muted-foreground opacity-0 outline-none transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 group-hover/tile:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}

      <img src={expresion.url} alt={expresion.nombre} className="size-14 object-contain" />

      {editing ? (
        <Input
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          onBlur={handleSave}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              setNombre(expresion.nombre)
              setEditing(false)
            }
          }}
          disabled={saving}
          autoFocus
          className="h-6 w-full text-center text-xs"
        />
      ) : (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 truncate text-xs text-muted-foreground outline-none hover:text-foreground disabled:pointer-events-none"
        >
          <span className="truncate">{expresion.nombre}</span>
          {canEdit && <Pencil className="size-3 shrink-0 opacity-0 group-hover/tile:opacity-100" />}
        </button>
      )}
    </div>
  )
}

export function ExpresionesSection({ server, canEdit }: ExpresionesSectionProps) {
  const [expresiones, setExpresiones] = useState<ServerExpresion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<ExpresionTipo>('emoji')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelado = false
    listarExpresiones(server.id)
      .then((data) => !cancelado && setExpresiones(data))
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [server.id])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const url = await subirExpresionServidor(server.id, file)
      const expresion = await crearExpresion(server.id, nombreDesdeArchivo(file), url, tab)
      setExpresiones((prev) => [...prev, expresion])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleRename(id: string, nombre: string) {
    const actualizada = await renombrarExpresion(id, nombre)
    setExpresiones((prev) => prev.map((e) => (e.id === id ? actualizada : e)))
  }

  async function handleDelete(id: string) {
    const previas = expresiones
    setExpresiones((prev) => prev.filter((e) => e.id !== id))
    try {
      await eliminarExpresion(id)
    } catch (err) {
      setExpresiones(previas)
      setError(getErrorMessage(err))
    }
  }

  const visibles = expresiones.filter((e) => e.tipo === tab)

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Expresiones</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Emojis y stickers personalizados de {server.name}.
      </p>

      <div className="mt-4 flex gap-1 border-b border-border">
        {(
          [
            ['emoji', 'Emojis'],
            ['sticker', 'Stickers'],
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
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}

      {!loading && (
        <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {visibles.map((expresion) => (
            <ExpresionTile
              key={expresion.id}
              expresion={expresion}
              canEdit={canEdit}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}

          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border p-3 text-muted-foreground outline-none hover:border-solid hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
              >
                <Plus className="size-5" />
                <span className="text-xs">{uploading ? 'Subiendo…' : 'Agregar'}</span>
              </button>
            </>
          )}
        </div>
      )}

      {!canEdit && (
        <p className="mt-6 text-xs text-muted-foreground">
          No tenés permiso para gestionar expresiones en este servidor.
        </p>
      )}
    </div>
  )
}
