import { Avatar, Box, Chip, ListItemButton, ListItemText, Typography } from '@mui/material'
import type { ChatListItem } from '@/types/chat'

type ConversationListItemProps = {
  chat: ChatListItem
  selected: boolean
  onClick: () => void
}

export default function ConversationListItem({
  chat,
  selected,
  onClick,
}: ConversationListItemProps) {
  return (
    <ListItemButton selected={selected} onClick={onClick} sx={{ py: 1.5, px: 2 }}>
      <Avatar src={chat.avatarUrl ?? undefined} alt={chat.title} sx={{ mr: 2 }} />
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
  )
}
