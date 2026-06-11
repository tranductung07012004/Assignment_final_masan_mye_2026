import { apiClient } from '@/api/client'
import type { ApiResponse, SpringPage } from '@/types/api'
import type { Friend } from '@/types/friend'

export const FRIEND_LIST_PAGE_SIZE = 5

export type FriendDto = {
  id: number
  fullName: string
  avatarUrl: string | null
  createdAt: string
}

export type ListFriendsParams = {
  keyword?: string
  page?: number
  size?: number
}

export type ListFriendsResult = {
  friends: Friend[]
  page: number
  totalPages: number
  totalElements: number
}

function mapFriend(dto: FriendDto): Friend {
  return {
    id: dto.id,
    fullName: dto.fullName,
    avatarUrl: dto.avatarUrl,
    createdAt: dto.createdAt,
  }
}

export type SendFriendRequestParams = {
  receiverId: number
}

export async function sendFriendRequest(
  params: SendFriendRequestParams,
): Promise<void> {
  await apiClient<ApiResponse<null>>('/api/friends/requests', {
    method: 'POST',
    body: { receiverId: params.receiverId },
  })
}

export async function listFriends(
  params: ListFriendsParams = {},
): Promise<ListFriendsResult> {
  const keyword = params.keyword ?? ''
  const page = params.page ?? 0
  const size = params.size ?? FRIEND_LIST_PAGE_SIZE

  const query = new URLSearchParams({
    keyword,
    page: String(page),
    size: String(size),
  })

  const response = await apiClient<ApiResponse<SpringPage<FriendDto>>>(
    `/api/chat/friends?${query}`,
  )

  const data = response.data

  return {
    friends: data.content.map(mapFriend),
    page: data.number,
    totalPages: Math.max(1, data.totalPages),
    totalElements: data.totalElements,
  }
}
