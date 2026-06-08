export type ChatListItem = {
  groupId: number
  title: string
  avatarUrl: string | null
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

export type ChatMessage = {
  id: number
  senderId: number
  senderName: string
  content: string
  sentAt: string
  isOwn: boolean
}
