import type { ChatType } from '@/types/chat'

type FormatMessagePreviewParams = {
  content?: string | null
  messageType?: string | null
  senderName?: string | null
  isOwn: boolean
  chatType: ChatType
}

function messageBody(content: string | null | undefined, messageType: string | null | undefined): string {
  switch (messageType) {
    case 'IMAGE':
      return '📷 Ảnh'
    case 'VIDEO':
      return '🎥 Video'
    case 'STICKERS':
      return 'Sticker'
    case 'TEXT':
    default:
      return content ?? ''
  }
}

export function formatMessagePreview({
  content,
  messageType,
  senderName,
  isOwn,
  chatType,
}: FormatMessagePreviewParams): string {
  if (!messageType && !content) return ''

  const body = messageBody(content, messageType)

  if (isOwn) {
    return `Bạn: ${body}`
  }

  if (chatType === 'GROUP') {
    return `${senderName ?? 'Ai đó'}: ${body}`
  }

  return body
}
