import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ImagePlus, Plus } from 'lucide-react'

import {
  actualizarAvatar,
  actualizarPerfil,
  obtenerPerfilEditable,
  type EditableProfile,
} from '@/lib/profiles'
import { subirAvatar } from '@/lib/storage'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChatUser, UserStatus } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const estados: { value: UserStatus; label: string; dot: string }[] = [
  { value: 'online', label: 'Conectado', dot: 'bg-online' },
  { value: 'idle', label: 'Ausente', dot: 'bg-idle' },
  { value: 'dnd', label: 'No molestar', dot: 'bg-dnd' },
  { value: 'offline', label: 'Desconectado', dot: 'bg-muted-foreground/60' },
]

const COLORES_BANNER = [
  '#6366f1',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#9ca3af',
]

interface ConfigurarPerfilDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onProfileUpdated: (user: ChatUser) => void
}

export function ConfigurarPerfilDialog({
  open,
  onOpenChange,
  userId,
  onProfileUpdated,
}: ConfigurarPerfilDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <ConfigurarPerfilForm
            key={userId}
            userId={userId}
            onProfileUpdated={onProfileUpdated}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ConfigurarPerfilForm({
  userId,
  onProfileUpdated,
}: {
  userId: string
  onProfileUpdated: (user: ChatUser) => void
}) {
  const [perfil, setPerfil] = useState<EditableProfile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [nombreUsuario, setNombreUsuario] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [biografia, setBiografia] = useState('')
  const [status, setStatus] = useState<UserStatus>('online')
  const [colorBanner, setColorBanner] = useState('#6366f1')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelado = false
    obtenerPerfilEditable(userId)
      .then((data) => {
        if (cancelado) return
        setPerfil(data)
        setNombreUsuario(data.nombreUsuario)
        setNombreCompleto(data.nombreCompleto)
        setBiografia(data.biografia)
        setStatus(data.status)
        setColorBanner(data.colorBanner)
      })
      .catch((err) => !cancelado && setLoadError(getErrorMessage(err)))
    return () => {
      cancelado = true
    }
  }, [userId])

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
    if (!perfil || !nombreUsuario.trim()) return

    setLoading(true)
    setError(null)
    setSaved(false)
    try {
      let avatarUrl = perfil.avatarUrl
      if (avatarFile) {
        avatarUrl = await subirAvatar(userId, avatarFile)
        await actualizarAvatar(userId, avatarUrl)
      }

      const actualizado = await actualizarPerfil(userId, {
        nombreUsuario,
        nombreCompleto,
        biografia,
        status,
        colorBanner,
      })

      setPerfil({ ...actualizado, avatarUrl })
      setAvatarFile(null)
      onProfileUpdated({
        id: userId,
        name: nombreCompleto.trim() || nombreUsuario.trim(),
        avatarUrl,
        status,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    )
  }
  if (!perfil) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>
  }

  const dirty =
    nombreUsuario.trim() !== perfil.nombreUsuario ||
    nombreCompleto.trim() !== perfil.nombreCompleto ||
    biografia.trim() !== perfil.biografia ||
    status !== perfil.status ||
    colorBanner !== perfil.colorBanner ||
    avatarFile !== null

  const previewSrc = avatarPreview ?? perfil.avatarUrl
  const estadoActual = estados.find((e) => e.value === status) ?? estados[0]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Configurar perfil</DialogTitle>
        <DialogDescription>
          Tu avatar, nombre y estado son visibles para todos los servidores en
          los que participás.
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePickAvatar}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar className="size-16">
            {previewSrc && <AvatarImage src={previewSrc} />}
            <AvatarFallback>
              {(nombreCompleto || nombreUsuario).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100">
            <ImagePlus className="size-5" />
          </span>
        </button>
        <div className="flex flex-col gap-1.5">
          <Label>Estado</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className={cn('size-2 rounded-full', estadoActual.dot)} />
                {estadoActual.label}
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {estados.map(({ value, label, dot }) => (
                <DropdownMenuItem key={value} onSelect={() => setStatus(value)}>
                  <span className={cn('size-2 rounded-full', dot)} />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="perfil_nombre_usuario">Nombre de usuario</Label>
          <Input
            id="perfil_nombre_usuario"
            value={nombreUsuario}
            onChange={(event) => setNombreUsuario(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="perfil_nombre_completo">Nombre para mostrar</Label>
          <Input
            id="perfil_nombre_completo"
            value={nombreCompleto}
            onChange={(event) => setNombreCompleto(event.target.value)}
            placeholder={nombreUsuario}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="perfil_biografia">Biografía</Label>
        <Textarea
          id="perfil_biografia"
          value={biografia}
          onChange={(event) => setBiografia(event.target.value)}
          placeholder="Contá algo sobre vos…"
          maxLength={280}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Color de banner</Label>
        <p className="text-xs text-muted-foreground">
          Se ve en la cabecera de tu tarjeta de perfil.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {COLORES_BANNER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColorBanner(c)}
              aria-label={c}
              aria-pressed={colorBanner === c}
              className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ backgroundColor: c }}
            >
              {colorBanner.toLowerCase() === c.toLowerCase() && (
                <Check className="size-3.5 text-white" strokeWidth={3} />
              )}
            </button>
          ))}

          <label className="relative flex size-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:border-solid hover:text-foreground">
            <Plus className="size-3.5" />
            <input
              type="color"
              value={colorBanner}
              onChange={(event) => setColorBanner(event.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="Elegir color personalizado"
            />
          </label>

          <Input
            value={colorBanner}
            onChange={(event) => setColorBanner(event.target.value)}
            className="h-7 w-24 font-mono text-xs"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={loading || !nombreUsuario.trim() || !dirty}>
          {loading ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Guardado ✓</span>}
      </div>
    </form>
  )
}
