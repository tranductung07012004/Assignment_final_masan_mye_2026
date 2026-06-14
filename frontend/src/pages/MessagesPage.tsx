import { Box } from '@mui/material'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
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

export default function MessagesPage() {
  const messagesByGroupId = useChatStore((state) => state.messagesByGroupId)
  const nextCursorByGroupId = useChatStore((state) => state.nextCursorByGroupId)
  const selectedGroupId = useChatStore((state) => state.selectedGroupId)
  const selectChat = useChatStore((state) => state.selectChat)
  const setMessages = useChatStore((state) => state.setMessages)
  const prependMessages = useChatStore((state) => state.prependMessages)

  const currentUserId = useProfileStore((state) => state.profile?.id ?? null)
  const { sendDirect, sendGroup } = useWebSocket()

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
        setMessages(selectedGroupId!, result.messages, result.nextCursor)
      } catch {
        // silently fail — existing messages stay visible
      } finally {
        setHistoryLoading(false)
      }
    }

    fetchHistory()
  }, [selectedGroupId, currentUserId, setMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesByGroupId, selectedGroupId])

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload video')
    } finally {
      setVideoUploading(false)
      setVideoUploadProgress(0)
    }
  }

  const messages = selectedGroupId ? (messagesByGroupId[selectedGroupId] ?? []) : []
  const hasMoreHistory = selectedGroupId
    ? (nextCursorByGroupId[selectedGroupId] ?? null) !== null
    : false

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <ConversationSidebar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={applySearch}
        onCreateGroup={() => setCreateDialogOpen(true)}
        chats={sidebarChats}
        loading={loading}
        error={error}
        selectedGroupId={selectedGroupId}
        onChatSelect={handleChatClick}
        onRetry={() => fetchChats(appliedKeyword, page)}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={setPage}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedChat ? (
          <ChatPanel
            chat={selectedChat}
            messages={messages}
            historyLoading={historyLoading}
            hasMoreHistory={hasMoreHistory}
            onLoadOlder={handleLoadOlder}
            onSettingsClick={() => setSettingsOpen(true)}
            messagesEndRef={messagesEndRef}
            draft={draft}
            onDraftChange={setDraft}
            onSend={handleSend}
            onImageSelected={handleImageSelected}
            onVideoSelected={handleVideoSelected}
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
