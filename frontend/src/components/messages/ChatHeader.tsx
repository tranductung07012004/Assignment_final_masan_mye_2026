import SettingsIcon from '@mui/icons-material/Settings'
import { Avatar, Box, IconButton, Typography } from '@mui/material'
import type { ChatListItem } from '@/types/chat'

type ChatHeaderProps = {
  chat: ChatListItem
  onSettingsClick: () => void
}

export default function ChatHeader({ chat, onSettingsClick }: ChatHeaderProps) {
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
      <Avatar src={chat.avatarUrl ?? undefined} alt={chat.title} />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
        {chat.title}
      </Typography>
      {chat.type === 'GROUP' && (
        <IconButton aria-label="Group settings" onClick={onSettingsClick}>
          <SettingsIcon />
        </IconButton>
      )}
    </Box>
  )
}
