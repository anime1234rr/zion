import { cn } from '@/lib/utils'

interface ResizeHandleProps {
  edge: 'left' | 'right'
  active: boolean
  onPointerDown: (event: React.PointerEvent) => void
}

export function ResizeHandle({ edge, active, onPointerDown }: ResizeHandleProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      className={cn(
        'group absolute top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none',
        edge === 'right' ? '-right-1' : '-left-1'
      )}
    >
      <div
        className={cn(
          'mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-primary/50',
          active && 'bg-primary'
        )}
      />
    </div>
  )
}
