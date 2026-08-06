import type { MentionableMember } from '@/lib/members'

interface MentionAutocompleteProps {
  query: string
  members: MentionableMember[]
  onSelect: (username: string) => void
}

export function MentionAutocomplete({ query, members, onSelect }: MentionAutocompleteProps) {
  const matches = members
    .filter((m) => m.username.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, 6)

  if (matches.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 mb-1.5 flex w-64 flex-col gap-0.5 rounded-lg border border-border bg-popover p-1.5 shadow-lg">
      {matches.map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onSelect(member.username)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
        >
          <span className="truncate text-sm font-medium text-foreground">{member.displayName}</span>
          <span className="truncate text-xs text-muted-foreground">@{member.username}</span>
        </button>
      ))}
    </div>
  )
}
