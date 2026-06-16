import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { forwardRef } from 'react'
import MessageBubble from '@/components/messages/MessageBubble'
import type { ChatMessage } from '@/types/chat'

type MessageListProps = {
  messages: ChatMessage[]
  showSenderName: boolean
  historyLoading: boolean
  hasMoreHistory: boolean
  onLoadOlder: () => void
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  { messages, showSenderName, historyLoading, hasMoreHistory, onLoadOlder },
  ref,
) {
  return (
    <Box
      ref={ref}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {hasMoreHistory && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Button
            size="small"
            variant="text"
            disabled={historyLoading}
            onClick={onLoadOlder}
          >
            {historyLoading ? 'Loading...' : 'Load older messages'}
          </Button>
        </Box>
      )}

      {historyLoading && messages.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : messages.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">No messages yet.</Typography>
        </Box>
      ) : (
        messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} showSenderName={showSenderName} />
        ))
      )}
    </Box>
  )
})

export default MessageList
