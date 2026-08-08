import { useEffect, useRef, useState } from 'react'
import {
  Blocks,
  Check,
  ChevronDown,
  Copy,
  Crown,
  Hash,
  History,
  ImagePlus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Smile,
  Users,
} from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'
import { actualizarServidor, regenerarInvitacion } from '@/lib/servers'
import { subirBannerServidor, subirIconoServidor } from '@/lib/storage'
import { buildInviteLink } from '@/lib/deep-links'
import { cn, getErrorMessage } from '@/lib/utils'
import { listarCanales } from '@/lib/channels'
import { listarMiembros, listarRolesDeServidor } from '@/lib/members'
import { listarExpresiones } from '@/lib/expresiones'
import { listarWebhooks } from '@/lib/webhooks'
import type {
  ServerDefaultNotifications,
  ServerHistoryRetention,
  ServerItem,
  ServerVerificationLevel,
} from '@/lib/types'
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

const NIVEL_VERIFICACION_LABEL: Record<ServerVerificationLevel, string> = {
  ninguno: 'Ninguno',
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
}

const RETENCION_LABEL: Record<ServerHistoryRetention, string> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
  '1a': '1 año',
  para_siempre: 'Para siempre',
}

interface ResumenGeneral {
  miembros: number
  canales: number
  roles: number
  expresiones: number
  apps: number
  ownerName: string | null
}

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
  const [resumen, setResumen] = useState<ResumenGeneral | null>(null)
  const [resumenError, setResumenError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelado = false

    Promise.all([
      listarMiembros(server.id),
      listarCanales(server.id),
      listarRolesDeServidor(server.id),
      listarExpresiones(server.id),
      listarWebhooks(server.id),
    ])
      .then(([miembros, categorias, roles, expresiones, apps]) => {
        if (cancelado) return
        setResumen({
          miembros: miembros.length,
          canales: categorias.flatMap((categoria) => categoria.channels).length,
          roles: roles.length,
          expresiones: expresiones.length,
          apps: apps.length,
          ownerName: miembros.find((m) => m.user.id === server.ownerId)?.user.name ?? null,
        })
      })
      .catch((err) => !cancelado && setResumenError(getErrorMessage(err)))

    return () => {
      cancelado = true
    }
  }, [server.id, server.ownerId])

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

  const ESTADISTICAS = [
    { icon: Users, label: 'Miembros', value: resumen?.miembros },
    { icon: Hash, label: 'Canales', value: resumen?.canales },
    { icon: Shield, label: 'Roles', value: resumen?.roles },
    { icon: Smile, label: 'Expresiones', value: resumen?.expresiones },
    { icon: Blocks, label: 'Apps', value: resumen?.apps },
  ]

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-foreground">Resumen</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Todo lo que tiene configurado {server.name} de un vistazo.
      </p>

      <h2 className="mt-8 text-sm font-semibold text-foreground uppercase">General</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Actividad y contenido actual de {server.name}.
      </p>
      {resumenError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {resumenError}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {ESTADISTICAS.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <stat.icon className="size-3.5 shrink-0" />
                <span className="truncate text-xs">{stat.label}</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {stat.value ?? '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-foreground uppercase">Configuración</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Valores actuales definidos para {server.name}.
      </p>
      <dl className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between gap-3 p-3">
          <dt className="flex items-center gap-2 text-sm text-foreground">
            <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
            Nivel de verificación
          </dt>
          <dd className="text-sm text-muted-foreground">
            {NIVEL_VERIFICACION_LABEL[server.verificationLevel]}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <dt className="flex items-center gap-2 text-sm text-foreground">
            <History className="size-4 shrink-0 text-muted-foreground" />
            Retención de historial
          </dt>
          <dd className="text-sm text-muted-foreground">
            {RETENCION_LABEL[server.historyRetention]}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <dt className="flex items-center gap-2 text-sm text-foreground">
            <Crown className="size-4 shrink-0 text-muted-foreground" />
            Propietario
          </dt>
          <dd className="text-sm text-muted-foreground">{resumen?.ownerName ?? '—'}</dd>
        </div>
      </dl>

      <h2 className="mt-8 text-sm font-semibold text-foreground uppercase">
        Identidad del servidor
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Banner, ícono y nombre que ven los miembros de {server.name}.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6">
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
          <h2 className="text-sm font-semibold text-foreground uppercase">
            Enlace de invitación
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cualquiera con este enlace puede unirse a {server.name}.
          </p>
          <div className="mt-3 flex w-full items-center justify-between gap-2 overflow-hidden rounded-lg border border-input bg-muted/40 p-2">
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
        <h2 className="text-sm font-semibold text-foreground uppercase">
          Notificaciones predeterminadas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nivel de alertas que reciben los miembros nuevos al unirse a {server.name}.
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!canEdit || savingNotif}>
            <button
              type="button"
              className="mt-3 flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60"
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
