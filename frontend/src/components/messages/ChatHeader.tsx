import SettingsIcon from '@mui/icons-material/Settings'
import { Avatar, Badge, Box, IconButton, Typography } from '@mui/material'
import { useChatStore } from '@/stores/chatStore'
import type { ChatListItem } from '@/types/chat'

type ChatHeaderProps = {
  chat: ChatListItem
  onSettingsClick: () => void
}

export default function ChatHeader({ chat, onSettingsClick }: ChatHeaderProps) {
  const presenceById = useChatStore((state) => state.presenceById)
  const isOnline = chat.type === 'PRIVATE' && chat.peerId != null
    ? (presenceById[chat.peerId] ?? false)
    : false

  return (
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
      {chat.type === 'PRIVATE' ? (
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
          sx={{
            '& .MuiBadge-badge': {
              bgcolor: isOnline ? 'success.main' : 'grey.400',
              boxShadow: '0 0 0 2px white',
              width: 10,
              height: 10,
              borderRadius: '50%',
            },
          }}
        >
          <Avatar src={chat.avatarUrl ?? undefined} alt={chat.title} />
        </Badge>
      ) : (
        <Avatar src={chat.avatarUrl ?? undefined} alt={chat.title} />
      )}
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {chat.title}
        </Typography>
        {chat.type === 'PRIVATE' && (
          <Typography variant="caption" sx={{ color: isOnline ? 'success.main' : 'text.secondary' }}>
            {isOnline ? 'Đang hoạt động' : 'Offline'}
          </Typography>
        )}
      </Box>
      {chat.type === 'GROUP' && (
        <IconButton aria-label="Group settings" onClick={onSettingsClick}>
          <SettingsIcon />
        </IconButton>
      )}
    </Box>
  )
}
