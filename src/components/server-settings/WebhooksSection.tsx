import { useEffect, useState } from 'react'
import { Check, Copy, Plus, Trash2, Webhook as WebhookIcon } from 'lucide-react'

import { useTextChannels } from '@/hooks/use-text-channels'
import {
  crearWebhook,
  eliminarWebhook,
  listarWebhooks,
  type ServerWebhook,
} from '@/lib/webhooks'
import { getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
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

interface WebhooksSectionProps {
  server: ServerItem
  canEdit: boolean
}

function CopyTokenButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(token)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copiado' : 'Copiar token'}
    </button>
  )
}

export function WebhooksSection({ server, canEdit }: WebhooksSectionProps) {
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
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Apps y Webhooks</h1>
      <p className="mt-1 text-sm text-muted-foreground">
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
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <WebhookIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{webhook.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">
                #{nombreDelCanal(webhook.canalId)}
              </p>
            </div>
            <CopyTokenButton token={webhook.token} />
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
    </div>
  )
}
