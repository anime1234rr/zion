import { useState } from 'react'
import {
  Accessibility,
  Bell,
  Globe,
  HardDrive,
  Image,
  Info,
  Keyboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Sliders,
} from 'lucide-react'

import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ChatUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { PerfilSection } from '@/components/account-settings/PerfilSection'
import { VozVideoSection } from '@/components/account-settings/VozVideoSection'
import { SeguridadSection } from '@/components/account-settings/SeguridadSection'
import { AparienciaSection } from '@/components/account-settings/AparienciaSection'
import { NotificacionesSection } from '@/components/account-settings/NotificacionesSection'
import { AlmacenamientoSection } from '@/components/account-settings/AlmacenamientoSection'
import { AccesibilidadSection } from '@/components/account-settings/AccesibilidadSection'
import { IdiomaSection } from '@/components/account-settings/IdiomaSection'
import { AtajosSection } from '@/components/account-settings/AtajosSection'
import { AyudaSection } from '@/components/account-settings/AyudaSection'
import { AcercaDeSection } from '@/components/account-settings/AcercaDeSection'

export type AccountSettingsSectionId =
  | 'perfil'
  | 'apariencia'
  | 'voz-video'
  | 'seguridad'
  | 'notificaciones'
  | 'almacenamiento'
  | 'accesibilidad'
  | 'idioma'
  | 'atajos'
  | 'ayuda'
  | 'acerca-de'

const sections: { id: AccountSettingsSectionId; label: string; icon: typeof Settings }[] = [
  { id: 'perfil', label: 'Mi cuenta', icon: Settings },
  { id: 'apariencia', label: 'Apariencia', icon: Image },
  { id: 'voz-video', label: 'Voz y video', icon: Sliders },
  { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'almacenamiento', label: 'Almacenamiento y Datos', icon: HardDrive },
  { id: 'accesibilidad', label: 'Accesibilidad', icon: Accessibility },
  { id: 'idioma', label: 'Idioma y Región', icon: Globe },
  { id: 'atajos', label: 'Atajos de Teclado', icon: Keyboard },
  { id: 'ayuda', label: 'Ayuda y Soporte', icon: LifeBuoy },
  { id: 'acerca-de', label: 'Acerca de', icon: Info },
]

interface AccountSettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSection?: AccountSettingsSectionId
  currentUser: ChatUser
  onProfileUpdated: (user: ChatUser) => void
}

export function AccountSettingsPanel({
  open,
  onOpenChange,
  initialSection = 'perfil',
  currentUser,
  onProfileUpdated,
}: AccountSettingsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(720px,85vh)] w-[min(1040px,92vw)] max-w-none flex-row gap-0 overflow-hidden rounded-xl p-0 sm:max-w-none"
      >
        {open && (
          <AccountSettingsBody
            key={currentUser.id}
            initialSection={initialSection}
            currentUser={currentUser}
            onProfileUpdated={onProfileUpdated}
          />
        )}
        <DialogClose asChild>
          <Button variant="ghost" size="icon-sm" className="absolute top-2 right-5">
            <XIcon />
            <span className="sr-only">Cerrar</span>
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

function AccountSettingsBody({
  initialSection,
  currentUser,
  onProfileUpdated,
}: {
  initialSection: AccountSettingsSectionId
  currentUser: ChatUser
  onProfileUpdated: (user: ChatUser) => void
}) {
  const [active, setActive] = useState<AccountSettingsSectionId>(initialSection)

  return (
    <>
      <nav className="flex w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 py-6">
        <div className="px-2 pb-3">
          <p className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Configuración
          </p>
        </div>

        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActive(section.id)}
            aria-current={active === section.id}
            className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground outline-none transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
              active === section.id &&
                'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            )}
          >
            <section.icon className="size-4 shrink-0" />
            {section.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto bg-popover">
        <div className="px-8 py-8">
          {active === 'perfil' && (
            <PerfilSection userId={currentUser.id} onProfileUpdated={onProfileUpdated} />
          )}
          {active === 'apariencia' && (
            <AparienciaSection currentUser={currentUser} onProfileUpdated={onProfileUpdated} />
          )}
          {active === 'voz-video' && <VozVideoSection />}
          {active === 'seguridad' && <SeguridadSection userId={currentUser.id} />}
          {active === 'notificaciones' && <NotificacionesSection />}
          {active === 'almacenamiento' && <AlmacenamientoSection />}
          {active === 'accesibilidad' && <AccesibilidadSection />}
          {active === 'idioma' && <IdiomaSection />}
          {active === 'atajos' && <AtajosSection />}
          {active === 'ayuda' && <AyudaSection />}
          {active === 'acerca-de' && <AcercaDeSection />}
        </div>
      </div>
    </>
  )
}
