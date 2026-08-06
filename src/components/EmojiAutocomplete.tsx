interface EmojiAutocompleteProps {
  query: string
  emojis: { nombre: string; url: string }[]
  onSelect: (nombre: string) => void
}

export function EmojiAutocomplete({ query, emojis, onSelect }: EmojiAutocompleteProps) {
  const matches = emojis
    .filter((e) => e.nombre.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, 6)

  if (matches.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 mb-1.5 flex w-56 flex-col gap-0.5 rounded-lg border border-border bg-popover p-1.5 shadow-lg">
      {matches.map((emoji) => (
        <button
          key={emoji.nombre}
          type="button"
          onClick={() => onSelect(emoji.nombre)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
        >
          <img src={emoji.url} alt={emoji.nombre} className="size-6 shrink-0 object-contain" />
          <span className="truncate text-sm text-foreground">:{emoji.nombre}:</span>
        </button>
      ))}
    </div>
  )
}
