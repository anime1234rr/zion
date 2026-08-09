import { openExternal } from '@/lib/electron-bridge'
import type { MessageEmbed } from '@/lib/types'

export function MessageEmbedCard({ embed }: { embed: MessageEmbed }) {
  return (
    <div
      className="mt-1.5 flex max-w-md gap-3 rounded-md border border-border bg-muted/30 py-2.5 pr-3 pl-3"
      style={{
        borderLeftColor: embed.color,
        borderLeftWidth: embed.color ? '4px' : undefined,
      }}
    >
      <div className="min-w-0 flex-1">
        {embed.title &&
          (embed.url ? (
            <button
              type="button"
              onClick={() => openExternal(embed.url!)}
              className="text-left text-sm font-semibold text-primary outline-none hover:underline"
            >
              {embed.title}
            </button>
          ) : (
            <p className="text-sm font-semibold text-foreground">{embed.title}</p>
          ))}

        {embed.description && (
          <p className="mt-1 text-sm whitespace-pre-wrap text-foreground/90">{embed.description}</p>
        )}

        {embed.fields && embed.fields.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {embed.fields.map((field, index) => (
              <div key={index} className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">{field.name}</p>
                <p className="text-xs whitespace-pre-wrap text-muted-foreground">{field.value}</p>
              </div>
            ))}
          </div>
        )}

        {embed.imageUrl && (
          <img
            src={embed.imageUrl}
            alt=""
            className="mt-2 max-h-64 max-w-full rounded-md object-contain"
          />
        )}

        {embed.footer && <p className="mt-2 text-[11px] text-muted-foreground">{embed.footer}</p>}
      </div>
    </div>
  )
}
