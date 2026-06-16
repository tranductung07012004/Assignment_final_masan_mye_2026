import { Box, Divider } from '@mui/material'
import type { ChangeEvent, RefObject } from 'react'
import ChatHeader from '@/components/messages/ChatHeader'
import MessageComposer from '@/components/messages/MessageComposer'
import MessageList from '@/components/messages/MessageList'
import type { ChatListItem, ChatMessage } from '@/types/chat'

type ChatPanelProps = {
  chat: ChatListItem
  messages: ChatMessage[]
  historyLoading: boolean
  hasMoreHistory: boolean
  onLoadOlder: () => void
  onSettingsClick: () => void
  messageListRef: RefObject<HTMLDivElement | null>
  draft: string
  onDraftChange: (value: string) => void
  onSend: () => void
  onImageSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onVideoSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onStickerSelect: (stickerId: string) => void
  imageUploading: boolean
  videoUploading: boolean
  videoUploadProgress: number
}

export default function ChatPanel({
  chat,
  messages,
  historyLoading,
  hasMoreHistory,
  onLoadOlder,
  onSettingsClick,
  messageListRef,
  draft,
  onDraftChange,
  onSend,
  onImageSelected,
  onVideoSelected,
  onStickerSelect,
  imageUploading,
  videoUploading,
  videoUploadProgress,
}: ChatPanelProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ChatHeader chat={chat} onSettingsClick={onSettingsClick} />

      <MessageList
        messages={messages}
        showSenderName={chat.type === 'GROUP'}
        historyLoading={historyLoading}
        hasMoreHistory={hasMoreHistory}
        onLoadOlder={onLoadOlder}
        ref={messageListRef}
      />

      <Divider />
      <MessageComposer
        draft={draft}
        onDraftChange={onDraftChange}
        onSend={onSend}
        onImageSelected={onImageSelected}
        onVideoSelected={onVideoSelected}
        onStickerSelect={onStickerSelect}
        imageUploading={imageUploading}
        videoUploading={videoUploading}
        videoUploadProgress={videoUploadProgress}
      />
    </Box>
  )
}
