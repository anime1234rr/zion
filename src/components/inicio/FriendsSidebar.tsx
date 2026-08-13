import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'

import {
  buscarUsuarioPorNombre,
  enviarSolicitudAmistad,
  listarAmistades,
  suscribirseAAmistades,
} from '@/lib/friends'
import { listarConversaciones, suscribirseAConversaciones } from '@/lib/dms'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChatUser, DMConversation, Friend } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { FriendRow } from '@/components/inicio/FriendRow'
import { PerfilUsuario } from '@/components/PerfilUsuario'
import { UserProfileCard } from '@/components/UserProfileCard'

type Tab = 'online' | 'todos' | 'pendientes' | 'bloqueados'

const TABS: { id: Tab; label: string }[] = [
  { id: 'online', label: 'Online' },
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'bloqueados', label: 'Bloqueados' },
]

interface FriendsSidebarProps {
  currentUserId: string
  profile: ChatUser | null
  activeConversationId: string | null
  onSelectConversation: (conversationId: string, otherUser: ChatUser) => void
  onMessageUser: (userId: string) => void
  onSignOut?: () => void
  onProfileUpdated?: (user: ChatUser) => void
}

export function FriendsSidebar({
  currentUserId,
  profile,
  activeConversationId,
  onSelectConversation,
  onMessageUser,
  onSignOut,
  onProfileUpdated,
}: FriendsSidebarProps) {
  const [tab, setTab] = useState<Tab>('online')
  const [friends, setFriends] = useState<Friend[]>([])
  const [conversations, setConversations] = useState<DMConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [searching, setSearching] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())

  function reload() {
    return Promise.all([listarAmistades(currentUserId), listarConversaciones(currentUserId)])
      .then(([f, c]) => {
        setFriends(f)
        setConversations(c)
        setError(null)
      })
      .catch((err) => setError(getErrorMessage(err)))
  }

  useEffect(() => {
    let cancelado = false
    reload().finally(() => !cancelado && setLoading(false))

    const unsubFriends = suscribirseAAmistades(currentUserId, () => reload())
    const unsubConversations = suscribirseAConversaciones(currentUserId, () => reload())

    return () => {
      cancelado = true
      unsubFriends()
      unsubConversations()
    }
  }, [currentUserId])

  useEffect(() => {
    const termino = search.trim()
    if (!termino) return
    let cancelado = false
    const timeout = setTimeout(() => {
      if (cancelado) return
      setSearching(true)
      buscarUsuarioPorNombre(termino, currentUserId)
        .then((results) => !cancelado && setSearchResults(results))
        .catch((err) => !cancelado && setAddError(getErrorMessage(err)))
        .finally(() => !cancelado && setSearching(false))
    }, 250)

    return () => {
      cancelado = true
      clearTimeout(timeout)
    }
  }, [search, currentUserId])

  async function handleAddFriend(userId: string) {
    setAddError(null)
    try {
      await enviarSolicitudAmistad(userId)
      setSentTo((prev) => new Set(prev).add(userId))
    } catch (err) {
      setAddError(getErrorMessage(err))
    }
  }

  const filteredFriends = useMemo(() => {
    switch (tab) {
      case 'online':
        return friends.filter((f) => f.status === 'aceptada' && f.user.status !== 'offline')
      case 'todos':
        return friends.filter((f) => f.status === 'aceptada' || f.status === 'pendiente_recibida' || f.status === 'pendiente_enviada')
      case 'pendientes':
        return friends.filter((f) => f.status === 'pendiente_enviada' || f.status === 'pendiente_recibida')
      case 'bloqueados':
        return friends.filter((f) => f.status === 'bloqueada')
    }
  }, [friends, tab])

  const pendingCount = useMemo(
    () => friends.filter((f) => f.status === 'pendiente_recibida').length,
    [friends]
  )

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="shrink-0 border-b border-sidebar-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Agregar amigo por nombre de usuario"
            className="h-8 pl-8 text-sm"
          />
        </div>

        {addError && (
          <p className="mt-1.5 text-xs text-destructive" role="alert">
            {addError}
          </p>
        )}

        {search.trim() && (
          <div className="mt-2 flex flex-col gap-1">
            {searching && <p className="px-1 text-xs text-muted-foreground">Buscando…</p>}
            {!searching && searchResults.length === 0 && (
              <p className="px-1 text-xs text-muted-foreground">Sin resultados.</p>
            )}
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50"
              >
                <Avatar size="sm">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                  <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleAddFriend(user.id)}
                  disabled={sentTo.has(user.id)}
                  aria-label="Enviar solicitud de amistad"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
                >
                  <UserPlus className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-1 border-b border-sidebar-border px-2 pt-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px flex items-center gap-1 border-b-2 border-transparent px-2 py-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground',
              tab === id && 'border-primary text-foreground'
            )}
          >
            {label}
            {id === 'pendientes' && pendingCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && <p className="px-1 py-2 text-xs text-muted-foreground">Cargando…</p>}
        {error && (
          <p className="px-1 py-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {tab === 'todos' && conversations.length > 0 && (
              <div className="mb-3">
                <p className="px-1 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Conversaciones recientes
                </p>
                <div className="flex flex-col gap-0.5">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectConversation(conversation.id, conversation.otherUser)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectConversation(conversation.id, conversation.otherUser)
                        }
                      }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50',
                        activeConversationId === conversation.id && 'bg-muted/70'
                      )}
                    >
                      <UserProfileCard
                        userId={conversation.otherUser.id}
                        currentUserId={currentUserId}
                        onMessageUser={onMessageUser}
                      >
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          className="shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <Avatar>
                            {conversation.otherUser.avatarUrl && (
                              <AvatarImage src={conversation.otherUser.avatarUrl} />
                            )}
                            <AvatarFallback>
                              {conversation.otherUser.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </UserProfileCard>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {conversation.otherUser.name}
                        </p>
                        {conversation.lastMessagePreview && (
                          <p className="truncate text-xs text-muted-foreground">
                            {conversation.lastMessagePreview}
                          </p>
                        )}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 mb-1 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Amigos
                </p>
              </div>
            )}

            {filteredFriends.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                {tab === 'online' && 'Nadie conectado ahora mismo.'}
                {tab === 'todos' && 'Todavía no agregaste amigos.'}
                {tab === 'pendientes' && 'No hay solicitudes pendientes.'}
                {tab === 'bloqueados' && 'No bloqueaste a nadie.'}
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {filteredFriends.map((friend) => (
                  <FriendRow
                    key={friend.id}
                    friend={friend}
                    currentUserId={currentUserId}
                    onMessage={onMessageUser}
                    onChanged={reload}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {profile && (
        <PerfilUsuario
          user={profile}
          onSignOut={onSignOut}
          onProfileUpdated={onProfileUpdated}
        />
      )}
    </aside>
  )
}
