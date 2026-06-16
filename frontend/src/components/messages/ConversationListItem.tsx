import { Avatar, Badge, Box, Chip, ListItemButton, ListItemText, Typography } from '@mui/material'
import type { ChatListItem, LastMessageEntry } from '@/types/chat'
import { useProfileStore } from '@/stores/profileStore'
import { formatMessagePreview } from '@/utils/messagePreview'

type ConversationListItemProps = {
  chat: ChatListItem
  selected: boolean
  unreadCount: number
  lastMessage?: LastMessageEntry
  onClick: () => void
}

export default function ConversationListItem({
  chat,
  selected,
  unreadCount,
  lastMessage,
  onClick,
}: ConversationListItemProps) {
  const badgeLabel = unreadCount >= 100 ? '99+' : unreadCount
  const currentUserId = useProfileStore((state) => state.profile?.id ?? null)

  // Prefer live store entry (realtime); fall back to REST initial fields on chat
  const content = lastMessage ? lastMessage.content : chat.lastMessageContent
  const messageType = lastMessage ? lastMessage.type : chat.lastMessageType
  const senderName = lastMessage ? lastMessage.senderName : chat.lastMessageSenderName
  const senderId = lastMessage ? lastMessage.senderId : chat.lastMessageSenderId

  const preview = messageType
    ? formatMessagePreview({
        content,
        messageType,
        senderName,
        isOwn: senderId === currentUserId,
        chatType: chat.type,
      })
    : null

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
        secondary={
          preview ? (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {preview}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block' }}>
              Chưa có tin nhắn
            </Typography>
          )
        }
      />
    </ListItemButton>
  )
}
