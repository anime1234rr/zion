import type { ChatUser } from '@/lib/types'
import { ConfigurarPerfilForm } from '@/components/ConfigurarPerfilForm'

interface PerfilSectionProps {
  userId: string
  onProfileUpdated: (user: ChatUser) => void
}

export function PerfilSection({ userId, onProfileUpdated }: PerfilSectionProps) {
  return (
    <div className="max-w-2xl">
      <ConfigurarPerfilForm key={userId} userId={userId} onProfileUpdated={onProfileUpdated} />
    </div>
  )
}
