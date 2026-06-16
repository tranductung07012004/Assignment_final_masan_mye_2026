import { Box } from '@mui/material'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { CHAT_LIST_PAGE_SIZE, listChats, loadMessages } from '@/api/chat'
import ChatEmptyState from '@/components/messages/ChatEmptyState'
import ChatPanel from '@/components/messages/ChatPanel'
import ConversationSidebar from '@/components/messages/ConversationSidebar'
import CreateGroupDialog from '@/components/messages/CreateGroupDialog'
import GroupSettingsDrawer from '@/components/messages/GroupSettingsDrawer'
import { useChatStore } from '@/stores/chatStore'
import { useProfileStore } from '@/stores/profileStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { ChatListItem } from '@/types/chat'
import { uploadChatImage, uploadChatVideo } from '@/utils/cloudinaryUpload'

const MARK_READ_THROTTLE_MS = 2500

type ScrollIntent = 'initial' | 'bottom' | 'preserve' | null

export default function MessagesPage() {
  const messagesByGroupId = useChatStore((state) => state.messagesByGroupId)
  const nextCursorByGroupId = useChatStore((state) => state.nextCursorByGroupId)
  const selectedGroupId = useChatStore((state) => state.selectedGroupId)
  const selectChat = useChatStore((state) => state.selectChat)
  const setMessages = useChatStore((state) => state.setMessages)
  const prependMessages = useChatStore((state) => state.prependMessages)
  const unreadCounts = useChatStore((state) => state.unreadCounts)
  const clearUnread = useChatStore((state) => state.clearUnread)
  const lastMessageByGroupId = useChatStore((state) => state.lastMessageByGroupId)
  const setLastMessages = useChatStore((state) => state.setLastMessages)

  const currentUserId = useProfileStore((state) => state.profile?.id ?? null)
  const { sendDirect, sendGroup, sendMarkRead } = useWebSocket()

  const markReadThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastMarkReadGroupRef = useRef<number | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [sidebarChats, setSidebarChats] = useState<ChatListItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState<ChatListItem | null>(null)

  const [draft, setDraft] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoUploadProgress, setVideoUploadProgress] = useState(0)

  const fetchIdRef = useRef(0)
  const messageListRef = useRef<HTMLDivElement>(null)
  const scrollIntentRef = useRef<ScrollIntent>(null)
  const preserveScrollRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null)

  const requestScrollToBottom = useCallback(() => {
    scrollIntentRef.current = 'bottom'
  }, [])

  const fetchChats = useCallback(async (keyword: string, pageNum: number) => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)

    try {
      const result = await listChats({
        keyword,
        page: pageNum,
        size: CHAT_LIST_PAGE_SIZE,
      })

      if (fetchId !== fetchIdRef.current) return

      setSidebarChats(result.chats)
      setLastMessages(result.chats)
      setTotalPages(result.totalPages)
      setTotalElements(result.totalElements)
      setPage(result.page)
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchChats(appliedKeyword, page)
  }, [appliedKeyword, page, fetchChats])

  useEffect(() => {
    if (!selectedGroupId || !currentUserId) return

    async function fetchHistory() {
      setHistoryLoading(true)
      try {
        const result = await loadMessages(selectedGroupId!, currentUserId!, null)
        scrollIntentRef.current = 'initial'
        setMessages(selectedGroupId!, result.messages, result.nextCursor)
      } catch {
        // silently fail — existing messages stay visible
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchHistory()
  }, [selectedGroupId, currentUserId, setMessages])

  const messages = selectedGroupId ? (messagesByGroupId[selectedGroupId] ?? []) : []

  useLayoutEffect(() => {
    const container = messageListRef.current
    if (!container) return

    const intent = scrollIntentRef.current
    if (intent === 'bottom' || intent === 'initial') {
      container.scrollTop = container.scrollHeight
      scrollIntentRef.current = null
      preserveScrollRef.current = null
    } else if (intent === 'preserve' && preserveScrollRef.current) {
      const { scrollHeight, scrollTop } = preserveScrollRef.current
      container.scrollTop = scrollTop + (container.scrollHeight - scrollHeight)
      scrollIntentRef.current = null
      preserveScrollRef.current = null
    }
  }, [messages, selectedGroupId])

  const flushMarkRead = useCallback(
    (groupId: number) => {
      const messages = messagesByGroupId[groupId]
      if (!messages || messages.length === 0) return
      const lastMsg = messages[messages.length - 1]
      sendMarkRead({ type: 'MARK_READ', groupId, lastReadMsgId: lastMsg.id })
      clearUnread(groupId)
    },
    [messagesByGroupId, sendMarkRead, clearUnread],
  )

  const scheduleMarkRead = useCallback(
    (groupId: number) => {
      if (markReadThrottleRef.current) clearTimeout(markReadThrottleRef.current)
      markReadThrottleRef.current = setTimeout(() => {
        flushMarkRead(groupId)
        markReadThrottleRef.current = null
      }, MARK_READ_THROTTLE_MS)
    },
    [flushMarkRead],
  )

  useEffect(() => {
    if (!selectedGroupId) return

    if (lastMarkReadGroupRef.current && lastMarkReadGroupRef.current !== selectedGroupId) {
      if (markReadThrottleRef.current) {
        clearTimeout(markReadThrottleRef.current)
        markReadThrottleRef.current = null
      }
      flushMarkRead(lastMarkReadGroupRef.current)
    }

    lastMarkReadGroupRef.current = selectedGroupId
    flushMarkRead(selectedGroupId)

    return () => {
      if (markReadThrottleRef.current) {
        clearTimeout(markReadThrottleRef.current)
        markReadThrottleRef.current = null
      }
    }
  }, [selectedGroupId])

  useEffect(() => {
    if (!selectedGroupId) return
    const messages = messagesByGroupId[selectedGroupId]
    if (!messages || messages.length === 0) return
    scheduleMarkRead(selectedGroupId)
  }, [messagesByGroupId, selectedGroupId, scheduleMarkRead])

  useEffect(() => {
    function handleBlur() {
      if (!selectedGroupId) return
      if (markReadThrottleRef.current) {
        clearTimeout(markReadThrottleRef.current)
        markReadThrottleRef.current = null
      }
      flushMarkRead(selectedGroupId)
    }
    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [selectedGroupId, flushMarkRead])

  function applySearch() {
    const keyword = searchInput.trim()
    if (keyword === appliedKeyword && page === 0) {
      fetchChats(keyword, 0)
      return
    }
    setAppliedKeyword(keyword)
    if (page !== 0) {
      setPage(0)
    }
  }

  function handleChatClick(chat: ChatListItem) {
    setSelectedChat(chat)
    selectChat(chat.groupId)
  }

  function handleGroupCreated(chat: ChatListItem) {
    setAppliedKeyword('')
    setSearchInput('')
    setPage(0)
    setSelectedChat(chat)
    selectChat(chat.groupId)
    fetchChats('', 0)
  }

  async function handleLoadOlder() {
    if (!selectedGroupId || !currentUserId) return
    const cursor = nextCursorByGroupId[selectedGroupId]
    if (cursor == null) return

    const container = messageListRef.current
    if (container) {
      preserveScrollRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      }
      scrollIntentRef.current = 'preserve'
    }

    setHistoryLoading(true)
    try {
      const result = await loadMessages(selectedGroupId, currentUserId, cursor)
      prependMessages(selectedGroupId, result.messages, result.nextCursor)
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false)
    }
  }

  function handleSend() {
    const content = draft.trim()
    if (!content || !selectedChat) return

    if (selectedChat.type === 'PRIVATE' && selectedChat.peerId != null) {
      sendDirect({ receiverId: selectedChat.peerId, content })
    } else if (selectedChat.type === 'GROUP') {
      sendGroup({ groupId: selectedChat.groupId, content })
    }

    setDraft('')
    requestScrollToBottom()
  }

  async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedChat) return

    setImageUploading(true)
    setError(null)

    try {
      const uploaded = await uploadChatImage(file)
      if (selectedChat.type === 'PRIVATE' && selectedChat.peerId != null) {
        sendDirect({
          receiverId: selectedChat.peerId,
          content: uploaded.secureUrl,
          messageType: 'IMAGE',
        })
      } else if (selectedChat.type === 'GROUP') {
        sendGroup({
          groupId: selectedChat.groupId,
          content: uploaded.secureUrl,
          messageType: 'IMAGE',
        })
      }
      requestScrollToBottom()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setImageUploading(false)
    }
  }

  async function handleVideoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedChat) return

    setVideoUploading(true)
    setVideoUploadProgress(0)
    setError(null)

    try {
      const uploaded = await uploadChatVideo(file, setVideoUploadProgress)
      if (selectedChat.type === 'PRIVATE' && selectedChat.peerId != null) {
        sendDirect({
          receiverId: selectedChat.peerId,
          content: uploaded.secureUrl,
          messageType: 'VIDEO',
        })
      } else if (selectedChat.type === 'GROUP') {
        sendGroup({
          groupId: selectedChat.groupId,
          content: uploaded.secureUrl,
          messageType: 'VIDEO',
        })
      }
      requestScrollToBottom()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload video')
    } finally {
      setVideoUploading(false)
      setVideoUploadProgress(0)
    }
  }

  function handleStickerSelect(stickerId: string) {
    if (!stickerId || !selectedChat) return

    if (selectedChat.type === 'PRIVATE' && selectedChat.peerId != null) {
      sendDirect({
        receiverId: selectedChat.peerId,
        content: stickerId,
        messageType: 'STICKERS',
      })
    } else if (selectedChat.type === 'GROUP') {
      sendGroup({
        groupId: selectedChat.groupId,
        content: stickerId,
        messageType: 'STICKERS',
      })
    }
    requestScrollToBottom()
  }

  const hasMoreHistory = selectedGroupId
    ? (nextCursorByGroupId[selectedGroupId] ?? null) !== null
    : false

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <ConversationSidebar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={applySearch}
        onCreateGroup={() => setCreateDialogOpen(true)}
        chats={sidebarChats}
        loading={loading}
        error={error}
        selectedGroupId={selectedGroupId}
        unreadCounts={unreadCounts}
        lastMessages={lastMessageByGroupId}
        onChatSelect={handleChatClick}
        onRetry={() => fetchChats(appliedKeyword, page)}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={setPage}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        {selectedChat ? (
          <ChatPanel
            chat={selectedChat}
            messages={messages}
            historyLoading={historyLoading}
            hasMoreHistory={hasMoreHistory}
            onLoadOlder={handleLoadOlder}
            onSettingsClick={() => setSettingsOpen(true)}
            messageListRef={messageListRef}
            draft={draft}
            onDraftChange={setDraft}
            onSend={handleSend}
            onImageSelected={handleImageSelected}
            onVideoSelected={handleVideoSelected}
            onStickerSelect={handleStickerSelect}
            imageUploading={imageUploading}
            videoUploading={videoUploading}
            videoUploadProgress={videoUploadProgress}
          />
        ) : (
          <ChatEmptyState />
        )}
      </Box>

      <CreateGroupDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handleGroupCreated}
      />

      {settingsOpen && selectedChat?.type === 'GROUP' && selectedGroupId !== null && (
        <GroupSettingsDrawer
          open={settingsOpen}
          groupId={selectedGroupId}
          groupTitle={selectedChat.title}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </Box>
  )
}
