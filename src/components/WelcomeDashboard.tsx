import { Compass, Link2, MessageSquareText, Pin, Plus, Sparkles, UserPlus } from 'lucide-react'

interface WelcomeDashboardProps {
  onCreateServer: () => void
  onJoinServer: () => void
}

const tips: { icon: typeof Compass; text: string }[] = [
  {
    icon: Link2,
    text: 'Invitá gente con un enlace de un clic — ya no hace falta copiar y pegar un código.',
  },
  {
    icon: Pin,
    text: 'Fijá los mensajes importantes desde el menú "···" de cualquier mensaje.',
  },
  {
    icon: MessageSquareText,
    text: 'Enter envía el mensaje, Shift + Enter hace un salto de línea.',
  },
  {
    icon: Compass,
    text: 'Organizá los canales en categorías y arrastralos para reordenarlos.',
  },
]

export function WelcomeDashboard({ onCreateServer, onJoinServer }: WelcomeDashboardProps) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Bienvenido a Zion</h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Todavía no formás parte de ningún servidor. Creá el tuyo o unite a uno existente
            para empezar a chatear.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCreateServer}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Plus className="size-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">Crear tu primer servidor</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Armá tu propio espacio con canales, roles y una plantilla lista para usar.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onJoinServer}
            className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <UserPlus className="size-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">Unirme con un código</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pegá un código o abrí un enlace de invitación para sumarte a un servidor existente.
              </p>
            </div>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Compass className="size-3.5" />
            Consejos rápidos
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {tips.map((tip) => (
              <li key={tip.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <tip.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{tip.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
