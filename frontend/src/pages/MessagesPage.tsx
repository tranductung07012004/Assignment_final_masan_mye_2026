import {
  Avatar,
  Badge,
  Box,
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
import SendIcon from '@mui/icons-material/Send'
import { useState } from 'react'
import { mockChatList, mockMessagesByGroupId } from '@/mock/chats'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function MessagesPage() {
  const [selectedGroupId, setSelectedGroupId] = useState(mockChatList[0]?.groupId ?? null)
  const [draft, setDraft] = useState('')

  const selectedChat = mockChatList.find((c) => c.groupId === selectedGroupId)
  const messages = selectedGroupId ? (mockMessagesByGroupId[selectedGroupId] ?? []) : []

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
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Conversations
          </Typography>
        </Box>
        <List disablePadding sx={{ flex: 1, overflow: 'auto' }}>
          {mockChatList.map((chat) => (
            <ListItemButton
              key={chat.groupId}
              selected={chat.groupId === selectedGroupId}
              onClick={() => setSelectedGroupId(chat.groupId)}
              sx={{ py: 1.5, px: 2 }}
            >
              <Badge
                badgeContent={chat.unreadCount}
                color="primary"
                invisible={chat.unreadCount === 0}
                sx={{ mr: 2 }}
              >
                <Avatar src={chat.avatarUrl ?? undefined} alt={chat.title} />
              </Badge>
              <ListItemText
                primary={chat.title}
                secondary={chat.lastMessage}
                slotProps={{
                  primary: {
                    noWrap: true,
                    sx: { fontWeight: chat.unreadCount > 0 ? 600 : 400 },
                  },
                  secondary: { noWrap: true },
                }}
              />
            </ListItemButton>
          ))}
        </List>
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
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {selectedChat.title}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {messages.map((msg) => (
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
                    {!msg.isOwn && (
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                        {msg.senderName}
                      </Typography>
                    )}
                    <Typography variant="body2">{msg.content}</Typography>
                  </Paper>
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ display: 'block', mt: 0.25, textAlign: msg.isOwn ? 'right' : 'left' }}
                  >
                    {formatTime(msg.sentAt)}
                  </Typography>
                </Box>
              ))}
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
    </Box>
  )
}
