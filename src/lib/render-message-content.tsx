const CONTENT_TOKEN_SPLIT_PATTERN = /(@(?:todos|aqu[ií])\b|@[a-zA-Z0-9_]{1,32}\b|:[a-zA-Z0-9_]+:)/gi
const ONLY_EMOJI_PATTERN = /^(\s*:[a-zA-Z0-9_]+:\s*)+$/

export function renderMessageContent(content: string, customEmojis: Map<string, string>) {
  const isJumbo = ONLY_EMOJI_PATTERN.test(content)
  const parts = content.split(CONTENT_TOKEN_SPLIT_PATTERN)
  if (parts.length === 1) return content

  return parts.map((part, index) => {
    if (/^@[a-zA-Z0-9_]+$/i.test(part)) {
      return (
        <span key={index} className="rounded bg-primary/15 px-1 font-medium text-primary">
          {part}
        </span>
      )
    }
    const emojiMatch = /^:([a-zA-Z0-9_]+):$/.exec(part)
    const emojiUrl = emojiMatch ? customEmojis.get(emojiMatch[1]) : undefined
    if (emojiUrl) {
      return (
        <img
          key={index}
          src={emojiUrl}
          alt={part}
          title={part}
          className={
            isJumbo
              ? 'inline-block size-16 align-middle object-contain'
              : 'inline-block size-5 -translate-y-0.5 align-middle object-contain'
          }
        />
      )
    }
    return <span key={index}>{part}</span>
  })
}
