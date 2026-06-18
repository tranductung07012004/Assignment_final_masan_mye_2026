export type ChatType = 'PRIVATE' | 'GROUP'

export type MemberRole = 'OWNER' | 'MEMBER'

export const MAX_GROUP_MEMBERS = 10000
export const MIN_GROUP_MEMBERS = 3
export const MIN_FRIENDS_TO_SELECT = MIN_GROUP_MEMBERS - 1
export const MAX_FRIENDS_TO_SELECT = MAX_GROUP_MEMBERS - 1

export const CURRENT_USER_ID = 1

export type ChatListItem = {
  groupId: number
  type: ChatType
  title: string
  avatarUrl: string | null
  /** Only present for PRIVATE chats — the other participant's user ID. */
  peerId?: number | null
  lastMessageContent?: string | null
  lastMessageType?: string | null
  lastMessageAt?: string | null
  lastMessageSenderId?: number | null
  lastMessageSenderName?: string | null
}

export type LastMessageEntry = {
  content: string | null
  type: string
  at: string
  senderId: number
  senderName: string | null
}

export type ChatMessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'STICKERS'

export type ChatMessage = {
  id: number
  groupId: number
  senderId: number
  senderName: string
  senderAvatarUrl: string | null
  content: string | null
  messageType: ChatMessageType | string
  sentAt: string
  isOwn: boolean
  isDeleted: boolean
}

export type GroupMember = {
  userId: number
  fullName: string
  avatarUrl: string | null
  role: MemberRole
  isSelf: boolean
}

export type CreateGroupInput = {
  title: string
  avatarUrl: string | null
  friendIds: number[]
}

