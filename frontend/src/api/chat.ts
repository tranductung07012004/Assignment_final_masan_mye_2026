import { apiClient } from '@/api/client'
import type { ApiResponse, SpringPage } from '@/types/api'
import type { ChatListItem, ChatType } from '@/types/chat'

export const CHAT_LIST_PAGE_SIZE = 5

export type ChatListItemDto = {
  groupId: number
  type: string
  title: string
  avatarUrl: string | null
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
