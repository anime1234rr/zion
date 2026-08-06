import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import { cn } from '@/lib/utils'

export interface RichComposerInputHandle {
  focus: () => void
}

interface RichComposerInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void
  placeholder?: string
  disabled?: boolean
  customEmojis: Map<string, string>
  className?: string
}

const EMOJI_IMG_CLASS = 'inline-block size-5 -translate-y-0.5 align-middle object-contain'
const SHORTCODE_PATTERN = /:([a-zA-Z0-9_]+):/g
const TRAILING_SHORTCODE_PATTERN = /:([a-zA-Z0-9_]+):$/

function buildEmojiImg(nombre: string, url: string): HTMLImageElement {
  const img = document.createElement('img')
  img.src = url
  img.alt = `:${nombre}:`
  img.dataset.emojiName = nombre
  img.className = EMOJI_IMG_CLASS
  img.contentEditable = 'false'
  return img
}

function extractLogicalValue(root: Node): string {
  let result = ''
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? ''
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.tagName === 'IMG') {
        result += el.dataset.emojiName ? `:${el.dataset.emojiName}:` : ''
      } else if (el.tagName === 'BR') {
        result += '\n'
      } else {
        result += extractLogicalValue(el)
        if (el.tagName === 'DIV') result += '\n'
      }
    }
  })
  return result
}

function rebuildDom(root: HTMLElement, value: string, customEmojis: Map<string, string>) {
  root.innerHTML = ''
  let lastIndex = 0
  let match: RegExpExecArray | null
  SHORTCODE_PATTERN.lastIndex = 0
  while ((match = SHORTCODE_PATTERN.exec(value))) {
    const url = customEmojis.get(match[1])
    if (!url) continue
    if (match.index > lastIndex) {
      root.appendChild(document.createTextNode(value.slice(lastIndex, match.index)))
    }
    root.appendChild(buildEmojiImg(match[1], url))
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < value.length) {
    root.appendChild(document.createTextNode(value.slice(lastIndex)))
  }
}

function placeCaretAtEnd(root: HTMLElement) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(root)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

export const RichComposerInput = forwardRef<RichComposerInputHandle, RichComposerInputProps>(
  function RichComposerInput(
    { value, onChange, onKeyDown, placeholder, disabled, customEmojis, className },
    forwardedRef
  ) {
    const rootRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(forwardedRef, () => ({
      focus: () => rootRef.current?.focus(),
    }))

    useEffect(() => {
      const root = rootRef.current
      if (!root) return
      if (extractLogicalValue(root) === value) return
      rebuildDom(root, value, customEmojis)
      placeCaretAtEnd(root)
    }, [value, customEmojis])

    function handleInput() {
      const root = rootRef.current
      if (!root) return

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
        const node = selection.anchorNode
        if (node && node.nodeType === Node.TEXT_NODE && root.contains(node)) {
          const textNode = node as Text
          const offset = selection.anchorOffset
          const textBefore = textNode.textContent?.slice(0, offset) ?? ''
          const match = TRAILING_SHORTCODE_PATTERN.exec(textBefore)
          const url = match ? customEmojis.get(match[1]) : undefined

          if (match && url) {
            const matchStart = offset - match[0].length
            const afterText = textNode.textContent!.slice(offset)
            textNode.textContent = textNode.textContent!.slice(0, matchStart)

            const img = buildEmojiImg(match[1], url)
            const afterNode = document.createTextNode(afterText)
            const parent = textNode.parentNode!
            parent.insertBefore(img, textNode.nextSibling)
            parent.insertBefore(afterNode, img.nextSibling)

            const newRange = document.createRange()
            newRange.setStart(afterNode, 0)
            newRange.collapse(true)
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        }
      }

      onChange(extractLogicalValue(root))
    }

    function handleKeyDownInternal(event: React.KeyboardEvent<HTMLDivElement>) {
      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault()
        document.execCommand('insertLineBreak')
        handleInput()
        return
      }
      onKeyDown?.(event)
    }

    function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
      event.preventDefault()
      document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
      handleInput()
    }

    return (
      <div
        ref={rootRef}
        role="textbox"
        aria-multiline
        aria-placeholder={placeholder}
        data-placeholder={placeholder}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDownInternal}
        onPaste={handlePaste}
        className={cn(
          'max-h-52 min-h-8 flex-1 overflow-y-auto py-1 text-base whitespace-pre-wrap break-words text-foreground outline-none md:text-sm',
          'empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]',
          disabled && 'pointer-events-none cursor-not-allowed opacity-50',
          className
        )}
      />
    )
  }
)
