import { Box, Paper, Typography } from '@mui/material'
import StickerBubbleContent from '@/components/messages/StickerBubbleContent'
import type { ChatMessage } from '@/types/chat'

function formatTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

type MessageBubbleProps = {
  message: ChatMessage
  showSenderName: boolean
}

export default function MessageBubble({ message, showSenderName }: MessageBubbleProps) {
  const isSticker = !message.isDeleted && message.messageType === 'STICKERS'

  return (
    <Box
      sx={{
        alignSelf: message.isOwn ? 'flex-end' : 'flex-start',
        maxWidth: '65%',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          px: isSticker ? 0 : 2,
          py: isSticker ? 0 : 1,
          bgcolor: message.isDeleted
            ? 'action.hover'
            : isSticker
            ? 'transparent'
            : message.isOwn
            ? 'primary.main'
            : 'background.paper',
          color: message.isOwn && !message.isDeleted && !isSticker
            ? 'primary.contrastText'
            : 'text.primary',
          border: message.isOwn && !message.isDeleted && !isSticker ? 'none' : isSticker ? 'none' : 1,
          borderColor: 'divider',
          fontStyle: message.isDeleted ? 'italic' : 'normal',
          boxShadow: isSticker ? 'none' : undefined,
        }}
      >
        {!message.isOwn && showSenderName && (
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}
          >
            {message.senderName}
          </Typography>
        )}
        {message.isDeleted ? (
          <Typography variant="body2" color="text.disabled">
            This message was deleted.
          </Typography>
        ) : message.messageType === 'IMAGE' && message.content ? (
          <Box
            component="img"
            src={message.content}
            alt="Shared image"
            sx={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: 280,
              borderRadius: 1,
            }}
          />
        ) : message.messageType === 'VIDEO' && message.content ? (
          <Box
            component="video"
            src={message.content}
            controls
            sx={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: 280,
              borderRadius: 1,
            }}
          />
        ) : message.messageType === 'STICKERS' && message.content ? (
          <StickerBubbleContent stickerId={message.content} />
        ) : (
          <Typography variant="body2">{message.content}</Typography>
        )}
      </Paper>
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{
          display: 'block',
          mt: 0.25,
          textAlign: message.isOwn ? 'right' : 'left',
        }}
      >
        {formatTime(message.sentAt)}
      </Typography>
    </Box>
  )
}
