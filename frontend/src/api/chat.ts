import { apiClient } from '@/api/client'
import type { ApiResponse, SpringPage } from '@/types/api'
import type { ChatListItem, ChatMessage, ChatType } from '@/types/chat'

export const CHAT_LIST_PAGE_SIZE = 5
export const MESSAGE_PAGE_SIZE = 5

export type ChatListItemDto = {
  groupId: number
  type: string
  title: string
  avatarUrl: string | null
  peerId: number | null
}

export type ListChatsParams = {
  keyword?: string
  page?: number
  size?: number
}

export type ListChatsResult = {
  chats: ChatListItem[]
  page: number
  totalPages: number
  totalElements: number
}

function mapChatListItem(dto: ChatListItemDto): ChatListItem {
  return {
    groupId: dto.groupId,
    type: dto.type as ChatType,
    title: dto.title,
    avatarUrl: dto.avatarUrl,
    peerId: dto.peerId ?? null,
  }
}

export type ChatMessageDto = {
  id: number
  groupId: number
  senderMemberId: number
  senderFullName: string | null
  senderAvatarUrl: string | null
  content: string | null
  messageType: string
  metadata: string | null
  createdAt: string
  deletedAt: string | null
}

export type MessageCursorPageDto = {
  messages: ChatMessageDto[]
  nextCursor: number | null
}

export type LoadMessagesResult = {
  messages: ChatMessage[]
  nextCursor: number | null
}

function mapMessage(dto: ChatMessageDto, currentUserId: number): ChatMessage {
  return {
    id: dto.id,
    groupId: dto.groupId,
    senderId: dto.senderMemberId,
    senderName: dto.senderFullName ?? 'Unknown',
    senderAvatarUrl: dto.senderAvatarUrl ?? null,
    content: dto.deletedAt ? null : dto.content,
    messageType: dto.messageType ?? 'TEXT',
    sentAt: dto.createdAt,
    isOwn: dto.senderMemberId === currentUserId,
    isDeleted: dto.deletedAt !== null,
  }
}

export async function loadMessages(
  groupId: number,
  currentUserId: number,
  beforeId?: number | null,
  size = MESSAGE_PAGE_SIZE,
): Promise<LoadMessagesResult> {
  const query = new URLSearchParams({ size: String(size) })
  if (beforeId != null) query.set('beforeId', String(beforeId))

  const response = await apiClient<ApiResponse<MessageCursorPageDto>>(
    `/api/chat/groups/${groupId}/messages?${query}`,
  )

  return {
    // Backend returns newest-first; reverse for chronological display
    messages: response.data.messages
      .map((m) => mapMessage(m, currentUserId))
      .reverse(),
    nextCursor: response.data.nextCursor,
  }
}

export async function listChats(
  params: ListChatsParams = {},
): Promise<ListChatsResult> {
  const keyword = params.keyword ?? ''
  const page = params.page ?? 0
  const size = params.size ?? CHAT_LIST_PAGE_SIZE

  const query = new URLSearchParams({
    keyword,
    page: String(page),
    size: String(size),
  })

  const response = await apiClient<ApiResponse<SpringPage<ChatListItemDto>>>(
    `/api/chat/list?${query}`,
  )

  const data = response.data

  return {
    chats: data.content.map(mapChatListItem),
    page: data.number,
    totalPages: Math.max(1, data.totalPages),
    totalElements: data.totalElements,
  }
}
