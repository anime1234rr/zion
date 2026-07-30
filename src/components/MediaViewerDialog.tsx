import { useEffect, useState } from 'react'
import { Check, Copy, Download, Forward, Loader2, Minus, Plus, X } from 'lucide-react'

import { cn, getErrorMessage } from '@/lib/utils'
import type { ChatAttachment } from '@/lib/types'

interface MediaViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attachment: ChatAttachment | null
  onForward?: () => void
}

const ZOOM_MIN = 1
const ZOOM_MAX = 3
const ZOOM_STEP = 0.5

const toolbarButtonClass =
  'flex size-9 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-40'

function fileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    return decodeURIComponent(pathname.split('/').pop() || 'archivo')
  } catch {
    return 'archivo'
  }
}

function convertToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(blob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(objectUrl)
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'))
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob)
        else reject(new Error('No se pudo convertir la imagen.'))
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo cargar la imagen.'))
    }
    img.src = objectUrl
  })
}

export function MediaViewerDialog({
  open,
  onOpenChange,
  attachment,
  onForward,
}: MediaViewerDialogProps) {
  const [zoom, setZoom] = useState(1)
  const [downloading, setDownloading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open || !attachment) return null

  async function handleDownload() {
    if (!attachment) return
    setDownloading(true)
    setActionError(null)
    try {
      const response = await fetch(attachment.url)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileNameFromUrl(attachment.url)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopy() {
    if (!attachment || attachment.type !== 'image') return
    setCopying(true)
    setActionError(null)
    try {
      const response = await fetch(attachment.url)
      const blob = await response.blob()
      const pngBlob = blob.type === 'image/png' ? blob : await convertToPng(blob)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setCopying(false)
    }
  }

  function handleForward() {
    onOpenChange(false)
    onForward?.()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal
      onClick={() => onOpenChange(false)}
    >
      <div
        className="flex shrink-0 items-center justify-end gap-1 p-3"
        onClick={(event) => event.stopPropagation()}
      >
        {attachment.type === 'image' && (
          <>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Alejar"
              className={toolbarButtonClass}
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-11 text-center text-xs text-white/70">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Acercar"
              className={toolbarButtonClass}
            >
              <Plus className="size-4" />
            </button>
            <span className="mx-1.5 h-5 w-px bg-white/15" />
          </>
        )}

        {onForward && (
          <button
            type="button"
            onClick={handleForward}
            aria-label="Reenviar"
            className={toolbarButtonClass}
          >
            <Forward className="size-4" />
          </button>
        )}

        {attachment.type === 'image' && (
          <button
            type="button"
            onClick={handleCopy}
            disabled={copying}
            aria-label="Copiar imagen"
            className={toolbarButtonClass}
          >
            {copied ? (
              <Check className="size-4 text-online" />
            ) : copying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          aria-label="Descargar"
          className={toolbarButtonClass}
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        </button>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar"
          className={toolbarButtonClass}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto px-4 pb-4">
        {attachment.type === 'image' ? (
          <img
            src={attachment.url}
            alt=""
            onClick={(event) => {
              event.stopPropagation()
              setZoom((z) => (z > ZOOM_MIN ? ZOOM_MIN : 2))
            }}
            style={{ transform: `scale(${zoom})` }}
            className={cn(
              'max-h-[85vh] max-w-[85vw] object-contain transition-transform duration-150',
              zoom > ZOOM_MIN ? 'cursor-zoom-out' : 'cursor-zoom-in'
            )}
          />
        ) : (
          <video
            src={attachment.url}
            controls
            autoPlay
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] max-w-[85vw] object-contain"
          />
        )}
      </div>

      {actionError && (
        <p
          className="shrink-0 px-4 pb-3 text-center text-xs text-destructive"
          role="alert"
          onClick={(event) => event.stopPropagation()}
        >
          {actionError}
        </p>
      )}
    </div>
  )
}
