import GroupAddIcon from '@mui/icons-material/GroupAdd'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import ConversationListItem from '@/components/messages/ConversationListItem'
import ListPagination from '@/components/common/ListPagination'
import type { ChatListItem, LastMessageEntry } from '@/types/chat'

type ConversationSidebarProps = {
  searchInput: string
  onSearchInputChange: (value: string) => void
  onSearch: () => void
  onCreateGroup: () => void
  chats: ChatListItem[]
  loading: boolean
  error: string | null
  selectedGroupId: number | null
  unreadCounts: Record<number, number>
  lastMessages: Record<number, LastMessageEntry>
  onChatSelect: (chat: ChatListItem) => void
  onRetry: () => void
  page: number
  totalPages: number
  totalElements: number
  onPageChange: (page: number) => void
}

export default function ConversationSidebar({
  searchInput,
  onSearchInputChange,
  onSearch,
  onCreateGroup,
  chats,
  loading,
  error,
  selectedGroupId,
  unreadCounts,
  lastMessages,
  onChatSelect,
  onRetry,
  page,
  totalPages,
  totalElements,
  onPageChange,
}: ConversationSidebarProps) {
  return (
    <Paper
      elevation={0}
      square
      sx={{
        width: 340,
        flexShrink: 0,
        minHeight: 0,
        alignSelf: 'stretch',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
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
          onChange={(e) => onSearchInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSearch()
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
                    onClick={onSearch}
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
          onClick={onCreateGroup}
        >
          Create Group
        </Button>
      </Box>

      <List disablePadding sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {loading && chats.length === 0 ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
            <Button size="small" onClick={onRetry}>
              Retry
            </Button>
          </Box>
        ) : chats.length === 0 ? (
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No conversations found.
            </Typography>
          </Box>
        ) : (
          chats.map((chat) => (
            <ConversationListItem
              key={chat.groupId}
              chat={chat}
              selected={chat.groupId === selectedGroupId}
              unreadCount={unreadCounts[chat.groupId] ?? 0}
              lastMessage={lastMessages[chat.groupId]}
              onClick={() => onChatSelect(chat)}
            />
          ))
        )}
      </List>

      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <ListPagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          itemCount={totalElements}
        />
      </Box>
    </Paper>
  )
}
