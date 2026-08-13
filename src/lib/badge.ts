import { setBadgeCount } from '@/lib/electron-bridge'

let canvas: HTMLCanvasElement | null = null

function drawBadgeIcon(count: number): string | null {
  canvas ??= document.createElement('canvas')
  const size = 64
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = '#ed4245'
  ctx.fill()

  const label = count > 99 ? '99+' : String(count)
  ctx.fillStyle = '#ffffff'
  ctx.font = `${label.length > 2 ? 24 : 34}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, size / 2, size / 2 + 2)

  return canvas.toDataURL('image/png')
}

export function updateAppBadge(count: number): void {
  document.title = count > 0 ? `zion (${count > 99 ? '99+' : count})` : 'zion'
  setBadgeCount(count, count > 0 ? drawBadgeIcon(count) : null)
}
