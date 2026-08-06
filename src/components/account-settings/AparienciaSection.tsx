import { useEffect, useRef, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'

import { actualizarFondoApp, obtenerFondoApp, type AppBackground } from '@/lib/profiles'
import { subirFondoApp, FONDO_APP_ACCEPT } from '@/lib/storage'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChatUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AparienciaSectionProps {
  currentUser: ChatUser
  onProfileUpdated: (user: ChatUser) => void
}

type Modo = 'archivo' | 'url'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov']

function inferirTipoDesdeUrl(url: string): 'imagen' | 'video' | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    if (VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return 'video'
    if (IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return 'imagen'
    return null
  } catch {
    return null
  }
}

export function AparienciaSection({ currentUser, onProfileUpdated }: AparienciaSectionProps) {
  const userId = currentUser.id
  const [fondo, setFondo] = useState<AppBackground | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [modo, setModo] = useState<Modo>('archivo')
  const [urlInput, setUrlInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelado = false
    obtenerFondoApp(userId)
      .then((data) => !cancelado && setFondo(data))
      .catch((err) => !cancelado && setLoadError(getErrorMessage(err)))
      .finally(() => !cancelado && setLoading(false))
    return () => {
      cancelado = true
    }
  }, [userId])

  function applyFondo(nuevo: AppBackground | null) {
    setFondo(nuevo)
    onProfileUpdated({
      ...currentUser,
      backgroundUrl: nuevo?.url,
      backgroundType: nuevo?.tipo,
    })
  }

  function handlePickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (!picked) return
    setError(null)
    setFile(picked)
    setFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(picked)
    })
  }

  async function handleApplyFile() {
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      const subido = await subirFondoApp(userId, file)
      await actualizarFondoApp(userId, subido)
      applyFondo(subido)
      setFile(null)
      setFilePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleApplyUrl() {
    const url = urlInput.trim()
    if (!url) return

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      setError('Ingresá una URL válida (tiene que empezar con http:// o https://).')
      return
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      setError('Solo se admiten URLs http:// o https://.')
      return
    }

    const nuevoFondo: AppBackground = { url, tipo: inferirTipoDesdeUrl(url) ?? 'imagen' }
    setSaving(true)
    setError(null)
    try {
      await actualizarFondoApp(userId, nuevoFondo)
      applyFondo(nuevoFondo)
      setUrlInput('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)
    setError(null)
    try {
      await actualizarFondoApp(userId, null)
      applyFondo(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const urlPreviewTipo = urlInput.trim() ? inferirTipoDesdeUrl(urlInput.trim()) : null

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Apariencia</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Elegí una imagen, video o GIF de fondo para la app. Podés subir un archivo propio o pegar
        una URL pública directa.
      </p>

      {loadError && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}

      {!loading && (
        <div className="mt-5 flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground uppercase">Fondo actual</Label>
          {fondo ? (
            <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {fondo.tipo === 'video' ? (
                  <video src={fondo.url} className="size-full object-cover" muted playsInline />
                ) : (
                  <img src={fondo.url} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{fondo.url}</p>
                <p className="text-xs text-muted-foreground">
                  {fondo.tipo === 'video' ? 'Video' : 'Imagen'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={handleRemove}
              >
                <Trash2 className="size-3.5" />
                Quitar
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
              No tenés un fondo personalizado configurado.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-border">
        {(
          [
            ['archivo', 'Subir archivo'],
            ['url', 'URL directa'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setModo(id)
              setError(null)
            }}
            className={cn(
              '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground outline-none hover:text-foreground',
              modo === id && 'border-primary font-medium text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {modo === 'archivo' && (
        <div className="mt-4 flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={FONDO_APP_ACCEPT}
            className="hidden"
            onChange={handlePickFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3 text-left outline-none hover:border-solid hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {filePreview ? (
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {file?.type.startsWith('video/') ? (
                  <video src={filePreview} className="size-full object-cover" muted playsInline />
                ) : (
                  <img src={filePreview} alt="" className="size-full object-cover" />
                )}
              </div>
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Upload className="size-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {file ? file.name : 'Elegí una imagen, GIF o video'}
              </p>
              <p className="text-xs text-muted-foreground">
                jpeg, png, gif, webp — hasta 10 MB. mp4, webm, mov — hasta 30 MB.
              </p>
            </div>
          </button>

          <div>
            <Button type="button" disabled={!file || saving} onClick={handleApplyFile}>
              {saving ? 'Aplicando…' : 'Subir y aplicar'}
            </Button>
          </div>
        </div>
      )}

      {modo === 'url' && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fondo_url">URL directa</Label>
            <Input
              id="fondo_url"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="https://ejemplo.com/fondo.gif"
            />
            <p className="text-xs text-muted-foreground">
              Tiene que ser un enlace directo a una imagen, GIF o video público (no una página
              web).
              {urlInput.trim() &&
                (urlPreviewTipo
                  ? ` Detectado como ${urlPreviewTipo === 'video' ? 'video' : 'imagen'}.`
                  : ' No se pudo detectar el tipo por la extensión — se va a intentar como imagen.')}
            </p>
          </div>

          <div>
            <Button type="button" disabled={!urlInput.trim() || saving} onClick={handleApplyUrl}>
              {saving ? 'Aplicando…' : 'Aplicar URL'}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
