import { useEffect, useState } from 'react'
import { BookOpen, Bot, Check, Copy, Pencil, Plus, ShieldCheck, Trash2, Webhook as WebhookIcon } from 'lucide-react'

import { useTextChannels } from '@/hooks/use-text-channels'
import { useServerPermissions } from '@/hooks/use-server-permissions'
import { writeClipboard } from '@/lib/electron-bridge'
import { subirAvatar } from '@/lib/storage'
import {
  actualizarPerfilWebhook,
  crearWebhook,
  eliminarWebhook,
  listarWebhooks,
  type ServerWebhook,
} from '@/lib/webhooks'
import {
  actualizarPerfilApp,
  crearTokenApp,
  listarTokensDeApps,
  revocarTokenApp,
  type AppToken,
} from '@/lib/appTokens'
import { listarRolesDeServidor, type ServerRole } from '@/lib/members'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChannelSelect } from '@/components/server-settings/ChannelSelect'
import { ConfirmarAccionDialog } from '@/components/server-settings/ConfirmarAccionDialog'
import { ApiGuideDialog } from '@/components/server-settings/ApiGuideDialog'

interface WebhooksSectionProps {
  server: ServerItem
  currentUserId: string
  canEdit: boolean
}

type Tab = 'webhooks' | 'apps'

function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        await writeClipboard(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copiado' : label}
    </button>
  )
}

export function WebhooksSection({ server, currentUserId, canEdit }: WebhooksSectionProps) {
  const [tab, setTab] = useState<Tab>('webhooks')
  const [guideOpen, setGuideOpen] = useState(false)
  const { isOwner, hasPermission } = useServerPermissions(server, currentUserId)
  const canManageApps = isOwner || hasPermission('gestionar_webhooks')

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/tokens`
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Apps y Webhooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conectá servicios externos o bots que actúen dentro de {server.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <BookOpen className="size-3.5" />
          Ver guía
        </button>
      </div>

      <ApiGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        functionUrl={functionUrl}
        anonKey={anonKey}
      />

      <div className="mt-4 flex w-fit gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setTab('webhooks')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            tab === 'webhooks'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <WebhookIcon className="size-3.5" />
          Webhooks
        </button>
        <button
          type="button"
          onClick={() => setTab('apps')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            tab === 'apps'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Bot className="size-3.5" />
          Apps
        </button>
      </div>

      {tab === 'webhooks' ? (
        <WebhooksTab server={server} canEdit={canEdit} currentUserId={currentUserId} />
      ) : (
        <AppsTab server={server} canManageApps={canManageApps} currentUserId={currentUserId} />
      )}
    </div>
  )
}

function WebhooksTab({
  server,
  canEdit,
  currentUserId,
}: {
  server: ServerItem
  canEdit: boolean
  currentUserId: string
}) {
  const { channels, loading: loadingChannels } = useTextChannels(server.id)
  const [webhooks, setWebhooks] = useState<ServerWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [canalId, setCanalId] = useState<string | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ServerWebhook | null>(null)
  const [editTarget, setEditTarget] = useState<ServerWebhook | null>(null)

  useEffect(() => {
    let cancelado = false
    listarWebhooks(server.id)
      .then((data) => !cancelado && setWebhooks(data))
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [server.id])

  function nombreDelCanal(canalId: string): string {
    return channels.find((c) => c.id === canalId)?.name ?? 'canal eliminado'
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim() || !canalId) return

    setCreating(true)
    setCreateError(null)
    try {
      const webhook = await crearWebhook(server.id, canalId, nombre)
      setWebhooks((prev) => [...prev, webhook])
      setCreateOpen(false)
      setNombre('')
      setCanalId(undefined)
    } catch (err) {
      setCreateError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mt-5">
      <p className="text-sm text-muted-foreground">
        Creá webhooks para que servicios externos envíen mensajes a un canal de {server.name}.
        Necesitás desplegar un endpoint receptor propio que use el token generado — Zion todavía
        no procesa las llamadas entrantes automáticamente.
      </p>

      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="mt-5 flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground outline-none hover:border-solid hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Plus className="size-4" />
          Crear webhook
        </button>
      )}

      {!loading && webhooks.length === 0 && (
        <p className="mt-5 text-sm text-muted-foreground">Todavía no hay webhooks creados.</p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {webhooks.map((webhook) => (
          <div
            key={webhook.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-popover p-3"
          >
            <Avatar className="shrink-0">
              {webhook.avatarUrl && <AvatarImage src={webhook.avatarUrl} />}
              <AvatarFallback>
                <WebhookIcon className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{webhook.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">
                #{nombreDelCanal(webhook.canalId)}
              </p>
            </div>
            <CopyButton value={webhook.token} label="Copiar token" />
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditTarget(webhook)}
                aria-label={`Editar perfil de ${webhook.nombre}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Pencil className="size-4" />
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setDeleteTarget(webhook)}
                aria-label={`Eliminar webhook ${webhook.nombre}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Crear webhook</DialogTitle>
              <DialogDescription>
                Elegí un nombre y el canal donde se van a publicar los mensajes.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="webhook_nombre">Nombre</Label>
              <Input
                id="webhook_nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Notificaciones de GitHub"
                required
                autoFocus
              />
            </div>

            <ChannelSelect
              label="Canal de destino"
              channels={channels}
              loading={loadingChannels}
              value={canalId}
              canEdit
              allowNone={false}
              onChange={(id) => setCanalId(id ?? undefined)}
            />

            {createError && (
              <p className="text-sm text-destructive" role="alert">
                {createError}
              </p>
            )}

            <Button type="submit" disabled={creating || !nombre.trim() || !canalId}>
              {creating ? 'Creando…' : 'Crear webhook'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {deleteTarget && (
        <ConfirmarAccionDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(next) => {
            if (!next) setDeleteTarget(null)
          }}
          title={`Eliminar webhook "${deleteTarget.nombre}"`}
          description="Cualquier servicio externo que use este token va a dejar de poder enviar mensajes."
          confirmLabel="Eliminar"
          onConfirm={async () => {
            await eliminarWebhook(deleteTarget.id)
            setWebhooks((prev) => prev.filter((w) => w.id !== deleteTarget.id))
            setDeleteTarget(null)
          }}
        />
      )}

      {!canEdit && (
        <p className="mt-6 text-xs text-muted-foreground">
          No tenés permiso para gestionar webhooks en este servidor.
        </p>
      )}

      {editTarget && (
        <EditWebhookProfileDialog
          webhook={editTarget}
          currentUserId={currentUserId}
          open={Boolean(editTarget)}
          onOpenChange={(next) => {
            if (!next) setEditTarget(null)
          }}
          onSaved={(updated) => {
            setWebhooks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)))
            setEditTarget(null)
          }}
        />
      )}
    </div>
  )
}

function EditWebhookProfileDialog({
  webhook,
  currentUserId,
  open,
  onOpenChange,
  onSaved,
}: {
  webhook: ServerWebhook
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: ServerWebhook) => void
}) {
  const [nombre, setNombre] = useState(webhook.nombre)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim()) return

    setSaving(true)
    setError(null)
    try {
      let avatarUrl = webhook.avatarUrl
      if (avatarFile) {
        avatarUrl = await subirAvatar(currentUserId, avatarFile)
      }
      await actualizarPerfilWebhook(webhook.id, nombre, avatarUrl)
      onSaved({ ...webhook, nombre: nombre.trim(), avatarUrl })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const previewSrc = avatarPreview ?? webhook.avatarUrl ?? undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Editar perfil del webhook</DialogTitle>
            <DialogDescription>
              Así se va a ver este webhook en los mensajes que publique.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <label className="group relative cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handlePickAvatar} />
              <Avatar className="size-14">
                {previewSrc && <AvatarImage src={previewSrc} />}
                <AvatarFallback>
                  <WebhookIcon className="size-6" />
                </AvatarFallback>
              </Avatar>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                Cambiar
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              Click en el avatar para subir una imagen.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="webhook_edit_nombre">Nombre</Label>
            <Input
              id="webhook_edit_nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={saving || !nombre.trim()}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AppsTab({
  server,
  canManageApps,
  currentUserId,
}: {
  server: ServerItem
  canManageApps: boolean
  currentUserId: string
}) {
  const [roles, setRoles] = useState<ServerRole[]>([])
  const [tokens, setTokens] = useState<AppToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [rolId, setRolId] = useState<string | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [revealedToken, setRevealedToken] = useState<string | null>(null)

  const [revokeTarget, setRevokeTarget] = useState<AppToken | null>(null)
  const [editTarget, setEditTarget] = useState<AppToken | null>(null)

  useEffect(() => {
    let cancelado = false
    Promise.all([listarRolesDeServidor(server.id), listarTokensDeApps(server.id)])
      .then(([r, t]) => {
        if (cancelado) return
        setRoles(r)
        setTokens(t)
      })
      .catch((err) => !cancelado && setError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [server.id])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim() || !rolId) return

    setCreating(true)
    setCreateError(null)
    try {
      const { app, token } = await crearTokenApp(server.id, rolId, nombre)
      const rol = roles.find((r) => r.id === rolId)
      setTokens((prev) => [...prev, { ...app, rolNombre: rol?.nombre ?? '', rolColor: rol?.color ?? null }])
      setRevealedToken(token)
      setNombre('')
      setRolId(undefined)
    } catch (err) {
      setCreateError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mt-5">
      <p className="text-sm text-muted-foreground">
        Generá un token de app para que un bot externo actúe en {server.name} con los mismos
        permisos que el rol elegido. Necesitás tu propio servicio que reciba y valide ese token —
        Zion solo lo emite y lo asocia a un rol.
      </p>

      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {canManageApps && (
        <button
          type="button"
          onClick={() => {
            setCreateOpen(true)
            setCreateError(null)
          }}
          className="mt-5 flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground outline-none hover:border-solid hover:bg-muted/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Plus className="size-4" />
          Crear token de app
        </button>
      )}

      {!loading && tokens.length === 0 && (
        <p className="mt-5 text-sm text-muted-foreground">Todavía no hay apps creadas.</p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {tokens.map((appToken) => (
          <div
            key={appToken.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-popover p-3"
          >
            <Avatar className="shrink-0">
              {appToken.avatarUrl && <AvatarImage src={appToken.avatarUrl} />}
              <AvatarFallback>
                <Bot className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {appToken.nombre}
                {appToken.revocado && (
                  <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    Revocado
                  </span>
                )}
              </p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: appToken.rolColor ?? '#9ca3af' }}
                />
                {appToken.rolNombre}
              </p>
            </div>
            {canManageApps && appToken.usuarioBotId && !appToken.revocado && (
              <button
                type="button"
                onClick={() => setEditTarget(appToken)}
                aria-label={`Editar perfil de ${appToken.nombre}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Pencil className="size-4" />
              </button>
            )}
            {canManageApps && !appToken.revocado && (
              <button
                type="button"
                onClick={() => setRevokeTarget(appToken)}
                aria-label={`Revocar token ${appToken.nombre}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setRevealedToken(null)
        }}
      >
        <DialogContent className={revealedToken ? 'sm:max-w-md' : 'sm:max-w-sm'}>
          {revealedToken ? (
            <>
              <DialogHeader>
                <DialogTitle>Token generado</DialogTitle>
                <DialogDescription>
                  Copialo ahora — por seguridad no vas a poder volver a verlo.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2">
                <code className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-foreground">
                  {revealedToken}
                </code>
                <CopyButton value={revealedToken} />
              </div>
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs text-primary">
                <ShieldCheck className="size-4 shrink-0" />
                Cualquiera con este token puede actuar con los permisos del rol elegido.
              </div>
              <Button
                type="button"
                onClick={() => {
                  setCreateOpen(false)
                  setRevealedToken(null)
                }}
              >
                Listo
              </Button>
            </>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Crear token de app</DialogTitle>
                <DialogDescription>
                  Elegí un nombre y el rol cuyos permisos va a tener esta app.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="app_nombre">Nombre</Label>
                <Input
                  id="app_nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Bot de moderación"
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Rol</Label>
                {roles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Este servidor todavía no tiene roles. Creá uno en Personas &gt; Roles.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setRolId(role.id)}
                        className={cn(
                          'flex items-center gap-2 rounded-md border border-transparent px-2.5 py-1.5 text-left text-sm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50',
                          rolId === role.id && 'border-border bg-muted/70'
                        )}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: role.color ?? '#9ca3af' }}
                        />
                        <span className="truncate text-foreground">{role.nombre}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {createError && (
                <p className="text-sm text-destructive" role="alert">
                  {createError}
                </p>
              )}

              <Button type="submit" disabled={creating || !nombre.trim() || !rolId}>
                {creating ? 'Creando…' : 'Crear token'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {revokeTarget && (
        <ConfirmarAccionDialog
          open={Boolean(revokeTarget)}
          onOpenChange={(next) => {
            if (!next) setRevokeTarget(null)
          }}
          title={`Revocar "${revokeTarget.nombre}"`}
          description="La app va a dejar de poder autenticarse con este token de inmediato."
          confirmLabel="Revocar"
          onConfirm={async () => {
            await revocarTokenApp(revokeTarget.id)
            setTokens((prev) =>
              prev.map((t) => (t.id === revokeTarget.id ? { ...t, revocado: true } : t))
            )
            setRevokeTarget(null)
          }}
        />
      )}

      {!canManageApps && (
        <p className="mt-6 text-xs text-muted-foreground">
          No tenés permiso para gestionar apps en este servidor.
        </p>
      )}

      {editTarget && (
        <EditAppProfileDialog
          appToken={editTarget}
          currentUserId={currentUserId}
          open={Boolean(editTarget)}
          onOpenChange={(next) => {
            if (!next) setEditTarget(null)
          }}
          onSaved={(updated) => {
            setTokens((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            setEditTarget(null)
          }}
        />
      )}
    </div>
  )
}

function EditAppProfileDialog({
  appToken,
  currentUserId,
  open,
  onOpenChange,
  onSaved,
}: {
  appToken: AppToken
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AppToken) => void
}) {
  const [nombre, setNombre] = useState(appToken.nombre)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!nombre.trim()) return

    setSaving(true)
    setError(null)
    try {
      let avatarUrl = appToken.avatarUrl
      if (avatarFile) {
        avatarUrl = await subirAvatar(currentUserId, avatarFile)
      }
      await actualizarPerfilApp(appToken.id, nombre, avatarUrl)
      onSaved({ ...appToken, nombre: nombre.trim(), avatarUrl })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const previewSrc = avatarPreview ?? appToken.avatarUrl ?? undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Editar perfil del bot</DialogTitle>
            <DialogDescription>
              Así se va a ver esta app en los mensajes y en la lista de miembros.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <label className="group relative cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handlePickAvatar} />
              <Avatar className="size-14">
                {previewSrc && <AvatarImage src={previewSrc} />}
                <AvatarFallback>
                  <Bot className="size-6" />
                </AvatarFallback>
              </Avatar>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                Cambiar
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              Click en el avatar para subir una imagen.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="app_edit_nombre">Nombre</Label>
            <Input
              id="app_edit_nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={saving || !nombre.trim()}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
