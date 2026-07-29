import { useCallback, useEffect, useRef, useState } from 'react'

interface UseResizablePanelOptions {
  storageKey: string
  defaultWidth: number
  minWidth: number
  maxWidth: number
  edge: 'left' | 'right'
}

function readStoredWidth(storageKey: string, defaultWidth: number, minWidth: number, maxWidth: number) {
  if (typeof window === 'undefined') return defaultWidth
  const stored = window.localStorage.getItem(storageKey)
  const parsed = stored ? Number(stored) : NaN
  return Number.isFinite(parsed) ? Math.min(maxWidth, Math.max(minWidth, parsed)) : defaultWidth
}

export function useResizablePanel({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  edge,
}: UseResizablePanelOptions) {
  const [width, setWidth] = useState(() =>
    readStoredWidth(storageKey, defaultWidth, minWidth, maxWidth)
  )
  const [resizing, setResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault()
      startXRef.current = event.clientX
      startWidthRef.current = width
      setResizing(true)
    },
    [width]
  )

  useEffect(() => {
    if (!resizing) return

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function handlePointerMove(event: PointerEvent) {
      const delta = event.clientX - startXRef.current
      const signedDelta = edge === 'right' ? delta : -delta
      const next = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + signedDelta))
      setWidth(next)
    }

    function handlePointerUp() {
      setResizing(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [resizing, edge, minWidth, maxWidth])

  useEffect(() => {
    if (resizing) return
    window.localStorage.setItem(storageKey, String(width))
  }, [width, resizing, storageKey])

  return { width, resizing, handlePointerDown }
}
