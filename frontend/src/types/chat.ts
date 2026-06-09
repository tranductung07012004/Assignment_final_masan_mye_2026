export type ChatType = 'PRIVATE' | 'GROUP'

export type MemberRole = 'OWNER' | 'MEMBER'

export const MAX_GROUP_MEMBERS = 10

export const CURRENT_USER_ID = 1

export type ChatListItem = {
  groupId: number
  type: ChatType
  title: string
  avatarUrl: string | null
}

export type ChatMessage = {
  id: number
  senderId: number
  senderName: string
  content: string
  sentAt: string
  isOwn: boolean
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

