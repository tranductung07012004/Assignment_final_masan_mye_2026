import { Box, Paper, Typography } from '@mui/material'
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
          px: 2,
          py: 1,
          bgcolor: message.isDeleted
            ? 'action.hover'
            : message.isOwn
            ? 'primary.main'
            : 'background.paper',
          color: message.isOwn && !message.isDeleted ? 'primary.contrastText' : 'text.primary',
          border: message.isOwn && !message.isDeleted ? 'none' : 1,
          borderColor: 'divider',
          fontStyle: message.isDeleted ? 'italic' : 'normal',
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
