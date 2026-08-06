import { useEffect, useRef, useState } from 'react'
import { Bold, Check, ChevronDown, ImagePlus, Italic, Palette, Plus } from 'lucide-react'

import {
  actualizarAvatar,
  actualizarBanner,
  actualizarPerfil,
  obtenerPerfilEditable,
  type EditableProfile,
} from '@/lib/profiles'
import { subirAvatar, subirBanner } from '@/lib/storage'
import { parseBioRichText } from '@/lib/bio-format'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChatUser, UserStatus } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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

export function ConfigurarPerfilForm({
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
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerRemoved, setBannerRemoved] = useState(false)
  const [bioColorPickerOpen, setBioColorPickerOpen] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const bioRef = useRef<HTMLTextAreaElement>(null)

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

  function wrapBioSelection(before: string, after: string = before) {
    const el = bioRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = biografia.slice(start, end) || 'texto'
    const next = `${biografia.slice(0, start)}${before}${selected}${after}${biografia.slice(end)}`
    setBiografia(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
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

      let bannerUrl = perfil.bannerUrl
      if (bannerFile) {
        bannerUrl = await subirBanner(userId, bannerFile)
        await actualizarBanner(userId, bannerUrl)
      } else if (bannerRemoved) {
        bannerUrl = undefined
        await actualizarBanner(userId, null)
      }

      const actualizado = await actualizarPerfil(userId, {
        nombreUsuario,
        nombreCompleto,
        biografia,
        status,
        colorBanner,
      })

      setPerfil({ ...actualizado, avatarUrl, bannerUrl })
      setAvatarFile(null)
      setBannerFile(null)
      setBannerRemoved(false)
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
    avatarFile !== null ||
    bannerFile !== null ||
    bannerRemoved

  const previewSrc = avatarPreview ?? perfil.avatarUrl
  const bannerSrc = bannerRemoved ? null : (bannerPreview ?? perfil.bannerUrl)
  const estadoActual = estados.find((e) => e.value === status) ?? estados[0]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu avatar, nombre y estado son visibles para todos los servidores en
          los que participás.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={
            bannerSrc
              ? { backgroundImage: `url(${bannerSrc})`, backgroundColor: colorBanner }
              : { backgroundColor: colorBanner }
          }
        />
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex items-end justify-between gap-3 p-4 pt-12">
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
              <Avatar className="size-16 ring-4 ring-black">
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
              <Label className="text-white/80">Estado</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-md border border-white/15 bg-black/30 px-2.5 py-1 text-xs font-medium text-white outline-none backdrop-blur-sm hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className={cn('size-2 rounded-full', estadoActual.dot)} />
                    {estadoActual.label}
                    <ChevronDown className="size-3 text-white/70" />
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

          <div className="flex shrink-0 flex-col items-end gap-1">
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
              className="flex items-center gap-1.5 rounded-md bg-black/40 px-2.5 py-1.5 text-xs font-medium text-white outline-none backdrop-blur-sm hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <ImagePlus className="size-3.5" />
              Cambiar banner
            </button>
            {bannerSrc && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                className="text-[11px] text-white/70 outline-none hover:text-destructive hover:underline"
              >
                Quitar banner
              </button>
            )}
          </div>
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
        <div className="flex items-center justify-between">
          <Label htmlFor="perfil_biografia">Biografía</Label>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => wrapBioSelection('**')}
              aria-label="Negrita"
              className="flex size-6 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Bold className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => wrapBioSelection('*')}
              aria-label="Cursiva"
              className="flex size-6 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Italic className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setBioColorPickerOpen((prev) => !prev)}
              aria-label="Color de texto"
              aria-pressed={bioColorPickerOpen}
              className={cn(
                'flex size-6 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                bioColorPickerOpen && 'bg-muted text-foreground'
              )}
            >
              <Palette className="size-3.5" />
            </button>
          </div>
        </div>

        {bioColorPickerOpen && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border p-1.5">
            {COLORES_BANNER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  wrapBioSelection(`[color=${c}]`, '[/color]')
                  setBioColorPickerOpen(false)
                }}
                aria-label={c}
                className="size-5 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        <Textarea
          ref={bioRef}
          id="perfil_biografia"
          value={biografia}
          onChange={(event) => setBiografia(event.target.value)}
          placeholder="Contá algo sobre vos… seleccioná texto y usá los botones de arriba para darle formato"
          maxLength={280}
        />

        {biografia && (
          <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-sm break-words whitespace-pre-wrap text-foreground/90">
            {parseBioRichText(biografia)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Color de banner</Label>
        <p className="text-xs text-muted-foreground">
          Fondo de tu tarjeta de perfil. Si subís una imagen o GIF, este color queda detrás (útil para GIFs con transparencia).
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
