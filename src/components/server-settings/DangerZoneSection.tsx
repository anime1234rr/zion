import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, Trash2 } from 'lucide-react'

import { listarMiembros, type ServerMember } from '@/lib/members'
import { eliminarServidor, transferirTitularidad } from '@/lib/servers'
import { getErrorMessage } from '@/lib/utils'
import type { ServerItem } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmarConNombreDialog } from '@/components/server-settings/ConfirmarConNombreDialog'

interface DangerZoneSectionProps {
  server: ServerItem
  currentUserId: string
  onServerUpdated: (server: ServerItem) => void
  onServerDeleted: (serverId: string) => void
}

export function DangerZoneSection({
  server,
  currentUserId,
  onServerUpdated,
  onServerDeleted,
}: DangerZoneSectionProps) {
  const [members, setMembers] = useState<ServerMember[]>([])
  const [target, setTarget] = useState<ServerMember | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    listarMiembros(server.id)
      .then((data) => setMembers(data.filter((m) => m.user.id !== currentUserId)))
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [server.id, currentUserId])

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Zona de peligro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Estas acciones son irreversibles o solo pueden deshacerse manualmente. Procedé con cuidado.
      </p>

      {loadError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}

      <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-border p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ArrowRightLeft className="size-4" />
            Transferir titularidad
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Convertí a otro miembro en el nuevo propietario. Vos dejás de tener control total del servidor.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={members.length === 0}>
              Elegir miembro
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {members.length === 0 && (
              <p className="px-1.5 py-1 text-xs text-muted-foreground">
                No hay otros miembros en el servidor.
              </p>
            )}
            {members.map((member) => (
              <DropdownMenuItem
                key={member.membershipId}
                onSelect={() => {
                  setTarget(member)
                  setTransferOpen(true)
                }}
              >
                <Avatar size="sm">
                  {member.user.avatarUrl && <AvatarImage src={member.user.avatarUrl} />}
                  <AvatarFallback>{member.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {member.user.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="size-4" />
            Eliminar servidor
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Borra permanentemente el servidor, sus canales, roles y mensajes. No se puede deshacer.
          </p>
        </div>

        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="size-4" />
          Eliminar
        </Button>
      </div>

      {target && (
        <ConfirmarConNombreDialog
          open={transferOpen}
          onOpenChange={(next) => {
            setTransferOpen(next)
            if (!next) setTarget(null)
          }}
          title={`Transferir "${server.name}" a ${target.user.name}`}
          description="Vas a dejar de ser el propietario. Esta acción solo puede revertirse si el nuevo propietario te transfiere el servidor de vuelta."
          expectedValue={server.name}
          confirmLabel="Transferir titularidad"
          onConfirm={async () => {
            const updated = await transferirTitularidad(server.id, target.user.id)
            onServerUpdated(updated)
          }}
        />
      )}

      <ConfirmarConNombreDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Eliminar "${server.name}"`}
        description="Se van a borrar todos los canales, roles, miembros y mensajes de este servidor. Esta acción no se puede deshacer."
        expectedValue={server.name}
        confirmLabel="Eliminar servidor"
        onConfirm={async () => {
          await eliminarServidor(server.id)
          onServerDeleted(server.id)
        }}
      />
    </div>
  )
}
