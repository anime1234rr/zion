import type { ReactNode } from 'react'

const TOKEN_RE = /\*\*(.+?)\*\*|\*(.+?)\*|\[color=(#[0-9a-fA-F]{3,8})\]([\s\S]+?)\[\/color\]/g

export function parseBioRichText(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0
  let match: RegExpExecArray | null

  TOKEN_RE.lastIndex = 0
  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const [, bold, italic, color, colorContent] = match
    if (bold !== undefined) {
      nodes.push(<strong key={key++}>{bold}</strong>)
    } else if (italic !== undefined) {
      nodes.push(<em key={key++}>{italic}</em>)
    } else if (color !== undefined) {
      nodes.push(
        <span key={key++} style={{ color }}>
          {colorContent}
        </span>
      )
    }

    lastIndex = TOKEN_RE.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}
