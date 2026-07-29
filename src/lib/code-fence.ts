import type { CodeBlock } from '@/lib/types'

const FENCE_RE = /^```(\S*)\n([\s\S]*?)\n?```$/

export function parseFencedCode(raw: string): {
  content?: string
  code?: CodeBlock
} {
  const trimmed = raw.trim()
  const match = FENCE_RE.exec(trimmed)
  if (match) {
    return { code: { language: match[1] || 'text', code: match[2] } }
  }
  return { content: raw }
}

export function formatFencedCode(code: CodeBlock): string {
  return `\`\`\`${code.language}\n${code.code}\n\`\`\``
}
