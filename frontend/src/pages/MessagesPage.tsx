import GroupAddIcon from '@mui/icons-material/GroupAdd'
import SearchIcon from '@mui/icons-material/Search'
import SendIcon from '@mui/icons-material/Send'
import SettingsIcon from '@mui/icons-material/Settings'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CHAT_LIST_PAGE_SIZE, listChats } from '@/api/chat'
import CreateGroupDialog from '@/components/messages/CreateGroupDialog'
import GroupSettingsDrawer from '@/components/messages/GroupSettingsDrawer'
import ListPagination from '@/components/common/ListPagination'
import { useChatStore } from '@/stores/chatStore'
import type { ChatListItem } from '@/types/chat'

function formatTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function MessagesPage() {
  const messagesByGroupId = useChatStore((state) => state.messagesByGroupId)
  const selectedGroupId = useChatStore((state) => state.selectedGroupId)
  const selectChat = useChatStore((state) => state.selectChat)

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

  const fetchIdRef = useRef(0)

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

  const messages = selectedGroupId ? (messagesByGroupId[selectedGroupId] ?? []) : []

  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <Paper
        elevation={0}
        square
        sx={{
          width: 340,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
            Conversations
          </Typography>

          <TextField
            fullWidth
            size="small"
            placeholder="Search by name... (Enter)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applySearch()
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton
                      size="small"
                      edge="start"
                      aria-label="Search conversations"
                      onClick={applySearch}
                    >
                      <SearchIcon fontSize="small" color="action" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 1.5 }}
          />

          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<GroupAddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Group
          </Button>
        </Box>

        <List disablePadding sx={{ flex: 1, overflow: 'auto' }}>
          {loading && sidebarChats.length === 0 ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : error ? (
            <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                {error}
              </Typography>
              <Button size="small" onClick={() => fetchChats(appliedKeyword, page)}>
                Retry
              </Button>
            </Box>
          ) : sidebarChats.length === 0 ? (
            <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No conversations found.
              </Typography>
            </Box>
          ) : (
            sidebarChats.map((chat) => (
              <ListItemButton
                key={chat.groupId}
                selected={chat.groupId === selectedGroupId}
                onClick={() => handleChatClick(chat)}
                sx={{ py: 1.5, px: 2 }}
              >
                <Avatar
                  src={chat.avatarUrl ?? undefined}
                  alt={chat.title}
                  sx={{ mr: 2 }}
                />
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="body2" noWrap>
                        {chat.title}
                      </Typography>
                      {chat.type === 'GROUP' && (
                        <Chip label="Group" size="small" sx={{ height: 18, fontSize: 11 }} />
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
            ))
          )}
        </List>

        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          <ListPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemCount={totalElements}
          />
        </Box>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedChat ? (
          <>
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Avatar
                src={selectedChat.avatarUrl ?? undefined}
                alt={selectedChat.title}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                {selectedChat.title}
              </Typography>
              {selectedChat.type === 'GROUP' && (
                <IconButton
                  aria-label="Group settings"
                  onClick={() => setSettingsOpen(true)}
                >
                  <SettingsIcon />
                </IconButton>
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {messages.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No messages yet.</Typography>
                </Box>
              ) : (
                messages.map((msg) => (
                  <Box
                    key={msg.id}
                    sx={{
                      alignSelf: msg.isOwn ? 'flex-end' : 'flex-start',
                      maxWidth: '65%',
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: msg.isOwn ? 'primary.main' : 'background.paper',
                        color: msg.isOwn ? 'primary.contrastText' : 'text.primary',
                        border: msg.isOwn ? 'none' : 1,
                        borderColor: 'divider',
                      }}
                    >
                      {!msg.isOwn && selectedChat.type === 'GROUP' && (
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}
                        >
                          {msg.senderName}
                        </Typography>
                      )}
                      <Typography variant="body2">{msg.content}</Typography>
                    </Paper>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{
                        display: 'block',
                        mt: 0.25,
                        textAlign: msg.isOwn ? 'right' : 'left',
                      }}
                    >
                      {formatTime(msg.sentAt)}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>

            <Divider />
            <Box sx={{ p: 2, display: 'flex', gap: 1, bgcolor: 'background.paper' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          color="primary"
                          disabled={!draft.trim()}
                          onClick={() => setDraft('')}
                        >
                          <SendIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">
              Select a conversation to start chatting.
            </Typography>
          </Box>
        )}
      </Box>

      <CreateGroupDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
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
