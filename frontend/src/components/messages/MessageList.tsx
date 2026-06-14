import { Box, Button, CircularProgress, Typography } from '@mui/material'
import type { RefObject } from 'react'
import MessageBubble from '@/components/messages/MessageBubble'
import type { ChatMessage } from '@/types/chat'

type MessageListProps = {
  messages: ChatMessage[]
  showSenderName: boolean
  historyLoading: boolean
  hasMoreHistory: boolean
  onLoadOlder: () => void
  messagesEndRef: RefObject<HTMLDivElement | null>
}

export default function MessageList({
  messages,
  showSenderName,
  historyLoading,
  hasMoreHistory,
  onLoadOlder,
  messagesEndRef,
}: MessageListProps) {
  return (
    <Box
      sx={{
        flex: 1,
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
      <div ref={messagesEndRef} />
    </Box>
  )
}
