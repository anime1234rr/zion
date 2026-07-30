import { cn } from '@/lib/utils'
import type { MessageReaction } from '@/lib/types'

interface MessageReactionsProps {
  reactions?: MessageReaction[]
  currentUserId: string
  onToggle: (emoji: string) => void
}

export function MessageReactions({ reactions, currentUserId, onToggle }: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map((reaction) => {
        const reactedByMe = reaction.userIds.includes(currentUserId)
        return (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => onToggle(reaction.emoji)}
            aria-pressed={reactedByMe}
            className={cn(
              'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              reactedByMe
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
            )}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.userIds.length}</span>
          </button>
        )
      })}
    </div>
  )
}
