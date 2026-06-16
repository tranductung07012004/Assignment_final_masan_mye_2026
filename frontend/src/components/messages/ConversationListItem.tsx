import { Avatar, Badge, Box, Chip, ListItemButton, ListItemText, Typography } from '@mui/material'
import type { ChatListItem } from '@/types/chat'

type ConversationListItemProps = {
  chat: ChatListItem
  selected: boolean
  unreadCount: number
  onClick: () => void
}

export default function ConversationListItem({
  chat,
  selected,
  unreadCount,
  onClick,
}: ConversationListItemProps) {
  const badgeLabel = unreadCount >= 100 ? '99+' : unreadCount

  return (
    <ListItemButton selected={selected} onClick={onClick} sx={{ py: 1.5, px: 2 }}>
      <Badge
        badgeContent={unreadCount > 0 ? badgeLabel : 0}
        color="error"
        overlap="circular"
        sx={{ mr: 2 }}
      >
        <Avatar src={chat.avatarUrl ?? undefined} alt={chat.title} />
      </Badge>
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
