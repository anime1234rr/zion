import type { LucideIcon } from 'lucide-react'

interface ComingSoonSectionProps {
  icon: LucideIcon
  title: string
  description: string
}

export function ComingSoonSection({
  icon: Icon,
  title,
  description,
}: ComingSoonSectionProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        Próximamente
      </span>
    </div>
  )
}
