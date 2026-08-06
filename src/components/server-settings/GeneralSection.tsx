import { useRef, useState } from 'react'
import { Check, ChevronDown, Copy, ImagePlus, RefreshCw } from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'
import { actualizarServidor, regenerarInvitacion } from '@/lib/servers'
import { subirBannerServidor, subirIconoServidor } from '@/lib/storage'
import { buildInviteLink } from '@/lib/deep-links'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ServerDefaultNotifications, ServerItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const OPCIONES_NOTIFICACIONES: { value: ServerDefaultNotifications; label: string }[] = [
  { value: 'todos', label: 'Todos los mensajes' },
  { value: 'menciones', label: 'Solo menciones' },
]

interface GeneralSectionProps {
  server: ServerItem
  canEdit: boolean
  canManageInvites: boolean
  onUpdated: (server: ServerItem) => void
}

export function GeneralSection({ server, canEdit, canManageInvites, onUpdated }: GeneralSectionProps) {
  const { user } = useAuth()
  const [nombre, setNombre] = useState(server.name)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerRemoved, setBannerRemoved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [savingNotif, setSavingNotif] = useState(false)
  const [notifError, setNotifError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  async function handleCopyInviteLink() {
    if (!server.inviteCode) return
    await navigator.clipboard.writeText(buildInviteLink(server.inviteCode))
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1500)
  }

  async function handleRegenerateInvite() {
    setRegenerating(true)
    setInviteError(null)
    try {
      const servidor = await regenerarInvitacion(server.id)
      onUpdated(servidor)
    } catch (err) {
      setInviteError(getErrorMessage(err))
    } finally {
      setRegenerating(false)
    }
  }

  async function handleChangeDefaultNotifications(value: ServerDefaultNotifications) {
    if (value === server.defaultNotifications) return
    setSavingNotif(true)
    setNotifError(null)
    try {
      const servidor = await actualizarServidor(server.id, { defaultNotifications: value })
      onUpdated(servidor)
    } catch (err) {
      setNotifError(getErrorMessage(err))
    } finally {
      setSavingNotif(false)
    }
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

  function handlePickBanner(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBannerFile(file)
    setBannerRemoved(false)
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  function handleRemoveBanner() {
    setBannerFile(null)
    setBannerPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setBannerRemoved(true)
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

      let bannerUrl: string | null | undefined
      if (bannerFile) {
        bannerUrl = await subirBannerServidor(user.id, bannerFile)
      } else if (bannerRemoved) {
        bannerUrl = null
      }

      const servidor = await actualizarServidor(server.id, {
        nombre,
        iconoUrl,
        bannerUrl,
      })
      onUpdated(servidor)
      setBannerFile(null)
      setBannerRemoved(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const previewSrc = iconPreview ?? server.iconUrl
  const bannerSrc = bannerRemoved ? null : (bannerPreview ?? server.bannerUrl)
  const dirty =
    nombre.trim() !== server.name || iconFile !== null || bannerFile !== null || bannerRemoved

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-foreground">Resumen</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nombre e ícono públicos de {server.name}.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Label>Banner del servidor</Label>
          <p className="text-xs text-muted-foreground">
            Imagen de marquesina que se muestra arriba de la lista de canales.
          </p>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePickBanner}
          />
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={!canEdit}
            className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground outline-none hover:border-solid hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
          >
            {bannerSrc ? (
              <img src={bannerSrc} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex items-center gap-1.5 text-sm">
                <ImagePlus className="size-4" />
                Subir banner
              </span>
            )}
          </button>
          {bannerSrc && canEdit && (
            <button
              type="button"
              onClick={handleRemoveBanner}
              className="self-start text-xs text-muted-foreground outline-none hover:text-destructive hover:underline"
            >
              Quitar banner
            </button>
          )}
        </div>

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

      {server.inviteCode && canManageInvites && (
        <div className="mt-8 w-full overflow-hidden border-t border-border pt-6">
          <Label>Enlace de invitación</Label>
          <div className="mt-1.5 flex w-full items-center justify-between gap-2 overflow-hidden rounded-lg border border-input bg-muted/40 p-2">
            <div className="min-w-0 flex-1 overflow-hidden px-1">
              <code className="min-w-0 truncate font-mono text-xs text-foreground sm:text-sm">
                {buildInviteLink(server.inviteCode)}
              </code>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerateInvite}
              disabled={regenerating}
              className="shrink-0"
            >
              <RefreshCw className={cn('size-4', regenerating && 'animate-spin')} />
              <span className="ml-1.5 hidden sm:inline">Regenerar</span>
            </Button>
            <Button type="button" size="sm" onClick={handleCopyInviteLink} className="shrink-0">
              {copiedLink ? <Check className="size-4" /> : <Copy className="size-4" />}
              <span className="ml-1.5 hidden sm:inline">{copiedLink ? 'Copiado' : 'Copiar'}</span>
              <span className="ml-1.5 sm:hidden">{copiedLink ? 'Cop.' : 'Copiar'}</span>
            </Button>
          </div>
          {inviteError && (
            <p className="mt-1.5 text-xs text-destructive" role="alert">
              {inviteError}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 w-full border-t border-border pt-6">
        <Label>Notificaciones predeterminadas</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Nivel de alertas que reciben los miembros nuevos al unirse a {server.name}.
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!canEdit || savingNotif}>
            <button
              type="button"
              className="mt-1.5 flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
            >
              {OPCIONES_NOTIFICACIONES.find((o) => o.value === server.defaultNotifications)?.label}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {OPCIONES_NOTIFICACIONES.map((opcion) => (
              <DropdownMenuItem
                key={opcion.value}
                onSelect={() => handleChangeDefaultNotifications(opcion.value)}
              >
                {opcion.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {notifError && (
          <p className="mt-1.5 text-xs text-destructive" role="alert">
            {notifError}
          </p>
        )}
      </div>
    </div>
  )
}
