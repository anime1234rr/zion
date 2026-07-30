import { useRef, useState } from 'react'
import { Check, Copy, ImagePlus } from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'
import { actualizarServidor } from '@/lib/servers'
import { subirIconoServidor } from '@/lib/storage'
import { buildInviteLink } from '@/lib/deep-links'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GeneralSectionProps {
  server: ServerItem
  canEdit: boolean
  onUpdated: (server: ServerItem) => void
}

export function GeneralSection({ server, canEdit, onUpdated }: GeneralSectionProps) {
  const { user } = useAuth()
  const [nombre, setNombre] = useState(server.name)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleCopyInviteLink() {
    if (!server.inviteCode) return
    await navigator.clipboard.writeText(buildInviteLink(server.inviteCode))
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1500)
  }

  function handlePickIcon(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setIconFile(file)
    setIconPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim() || !user) return

    setLoading(true)
    setError(null)
    setSaved(false)
    try {
      const iconoUrl = iconFile
        ? await subirIconoServidor(user.id, iconFile)
        : undefined
      const servidor = await actualizarServidor(server.id, {
        nombre,
        iconoUrl,
      })
      onUpdated(servidor)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const previewSrc = iconPreview ?? server.iconUrl
  const dirty = nombre.trim() !== server.name || iconFile !== null

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-foreground">Resumen</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nombre e ícono públicos de {server.name}.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePickIcon}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canEdit}
            className={cn(
              'flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 text-muted-foreground outline-none hover:border-solid hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60'
            )}
          >
            {previewSrc ? (
              <img
                src={previewSrc}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <ImagePlus className="size-6" />
            )}
          </button>
          <div className="flex-1">
            <Label htmlFor="nombre_servidor_general">Nombre del servidor</Label>
            <Input
              id="nombre_servidor_general"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
              disabled={!canEdit}
              className="mt-1.5"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {canEdit ? (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading || !nombre.trim() || !dirty}>
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            {saved && (
              <span className="text-sm text-muted-foreground">Guardado ✓</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No tenés permiso para editar la configuración de este servidor.
          </p>
        )}
      </form>

      {server.inviteCode && (
        <div className="mt-8 w-full overflow-hidden border-t border-border pt-6">
          <Label>Enlace de invitación</Label>
          <div className="mt-1.5 flex w-full items-center justify-between gap-2 overflow-hidden rounded-lg border border-input bg-muted/40 p-2">
            <div className="min-w-0 flex-1 overflow-hidden px-1">
              <code className="min-w-0 truncate font-mono text-xs text-foreground sm:text-sm">
                {buildInviteLink(server.inviteCode)}
              </code>
            </div>
            <Button type="button" size="sm" onClick={handleCopyInviteLink} className="shrink-0">
              {copiedLink ? <Check className="size-4" /> : <Copy className="size-4" />}
              <span className="ml-1.5 hidden sm:inline">{copiedLink ? 'Copiado' : 'Copiar'}</span>
              <span className="ml-1.5 sm:hidden">{copiedLink ? 'Cop.' : 'Copiar'}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
