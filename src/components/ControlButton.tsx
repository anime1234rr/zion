import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ControlButton({
  onClick,
  active,
  label,
  activeColor = 'destructive',
  disabled = false,
  children,
}: {
  onClick: () => void
  active: boolean
  label: string
  activeColor?: 'destructive' | 'primary'
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={active}
          aria-label={label}
          className={cn(
            'flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40',
            active && activeColor === 'destructive' && 'bg-destructive/10 text-destructive',
            active && activeColor === 'primary' && 'bg-primary/10 text-primary'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
