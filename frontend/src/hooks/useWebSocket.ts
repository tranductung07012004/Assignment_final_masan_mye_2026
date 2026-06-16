import { useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useProfileStore } from '@/stores/profileStore'
import type { ChatMessage } from '@/types/chat'
import type { MarkRead } from '@/types/websocket'
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
  metadata: string | null
  createdAt: string
  deletedAt: string | null
}

type OutgoingMessagePayload = {
  content: string
  messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'STICKERS'
}

type SendDirectPayload = OutgoingMessagePayload & {
  receiverId: number
}

type SendGroupPayload = OutgoingMessagePayload & {
  groupId: number
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intentionalCloseRef = useRef(false)
  const accessToken = useAuthStore((state) => state.accessToken)
  const currentUserId = useProfileStore((state) => state.profile?.id ?? null)
  const appendMessage = useChatStore((state) => state.appendMessage)
  const setUnreadCounts = useChatStore((state) => state.setUnreadCounts)
  const incrementUnread = useChatStore((state) => state.incrementUnread)
  const clearUnread = useChatStore((state) => state.clearUnread)
  const selectedGroupId = useChatStore((state) => state.selectedGroupId)
  const currentUserIdRef = useRef(currentUserId)
  const appendMessageRef = useRef(appendMessage)
  const setUnreadCountsRef = useRef(setUnreadCounts)
  const incrementUnreadRef = useRef(incrementUnread)
  const clearUnreadRef = useRef(clearUnread)
  const selectedGroupIdRef = useRef(selectedGroupId)

  currentUserIdRef.current = currentUserId
  appendMessageRef.current = appendMessage
  setUnreadCountsRef.current = setUnreadCounts
  incrementUnreadRef.current = incrementUnread
  clearUnreadRef.current = clearUnread
  selectedGroupIdRef.current = selectedGroupId

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  const connect = useCallback(() => {
    if (!accessToken || !currentUserIdRef.current) return

    const existing = wsRef.current
    if (
      existing &&
      (existing.readyState === WebSocket.CONNECTING ||
        existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CLOSING)
    ) {
      return
    }

    intentionalCloseRef.current = false
    clearReconnectTimer()

    const deviceId = getDeviceId()
    const wsUrl = `${WS_BASE_URL}/ws?token=${encodeURIComponent(accessToken)}&deviceId=${encodeURIComponent(deviceId)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      clearReconnectTimer()
    }

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>

        if (data.type === 'UNREAD_SNAPSHOT') {
          setUnreadCountsRef.current(data.counts as Record<string, number>)
          return
        }

        if (data.type === 'READ_SYNC') {
          const groupId = data.groupId as number
          const count = data.count as number
          if (count === 0) {
            clearUnreadRef.current(groupId)
          }
          return
        }

        // no type field → chat message
        const dto = data as IncomingMessageDto
        const isOwn = dto.senderMemberId === currentUserIdRef.current
        const message: ChatMessage = {
          id: dto.id,
          groupId: dto.groupId,
          senderId: dto.senderMemberId,
          senderName: dto.senderFullName ?? 'Unknown',
          senderAvatarUrl: dto.senderAvatarUrl ?? null,
          content: dto.deletedAt ? null : dto.content,
          messageType: dto.messageType ?? 'TEXT',
          sentAt: dto.createdAt,
          isOwn,
          isDeleted: dto.deletedAt !== null,
        }
        appendMessageRef.current(message)

        if (!isOwn && dto.groupId !== selectedGroupIdRef.current) {
          incrementUnreadRef.current(dto.groupId)
        }
      } catch {
        // malformed payload — ignore
      }
    }

    ws.onclose = () => {
      // Fix 4 (broken pipe): chi socket dang la "current" moi duoc phep reconnect.
      // Neu socket nay da bi thay bang socket moi (stale) hoac dong chu dich (cleanup / React StrictMode) ->
      // KHONG reconnect, tranh tao them WS trung deviceId khien server kill -> reconnect loop.
      const isCurrent = wsRef.current === ws
      if (isCurrent) {
        wsRef.current = null
      }
      if (!isCurrent || intentionalCloseRef.current) return
      clearReconnectTimer()
      reconnectTimerRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [accessToken, currentUserId])

  useEffect(() => {
    connect()
    return () => {
      intentionalCloseRef.current = true
      clearReconnectTimer()
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

  const sendMarkRead = useCallback((payload: MarkRead) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  return { sendDirect, sendGroup, sendMarkRead }
}
