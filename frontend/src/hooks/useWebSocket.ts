import { useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useProfileStore } from '@/stores/profileStore'
import type { ChatMessage } from '@/types/chat'
import { getDeviceId } from '@/utils/deviceId'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8080'

type IncomingMessageDto = {
  id: number
  groupId: number
  senderMemberId: number
  senderFullName: string | null
  senderAvatarUrl: string | null
  content: string | null
  messageType: string
  createdAt: string
  deletedAt: string | null
}

type SendDirectPayload = {
  receiverId: number
  content: string
}

type SendGroupPayload = {
  groupId: number
  content: string
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = useProfileStore((state) => state.profile?.id ?? null)
  const appendMessage = useChatStore((state) => state.appendMessage)

  const connect = useCallback(() => {
    if (!accessToken || !currentUserId) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const deviceId = getDeviceId()
    const ws = new WebSocket(
      `${WS_BASE_URL}/ws?token=${encodeURIComponent(accessToken)}&deviceId=${encodeURIComponent(deviceId)}`,
    )
    wsRef.current = ws

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const dto = JSON.parse(event.data) as IncomingMessageDto
        const message: ChatMessage = {
          id: dto.id,
          groupId: dto.groupId,
          senderId: dto.senderMemberId,
          senderName: dto.senderFullName ?? 'Unknown',
          senderAvatarUrl: dto.senderAvatarUrl ?? null,
          content: dto.deletedAt ? null : dto.content,
          sentAt: dto.createdAt,
          isOwn: dto.senderMemberId === currentUserId,
          isDeleted: dto.deletedAt !== null,
        }
        appendMessage(message)
      } catch {
        // malformed payload — ignore
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      reconnectTimerRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [accessToken, currentUserId, appendMessage])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const sendDirect = useCallback((payload: SendDirectPayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
      return
    }
    console.warn('WebSocket is not connected — message was not sent')
  }, [])

  const sendGroup = useCallback((payload: SendGroupPayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
      return
    }
    console.warn('WebSocket is not connected — message was not sent')
  }, [])

  return { sendDirect, sendGroup }
}
