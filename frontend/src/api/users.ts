import { apiClient } from '@/api/client'
import type { ApiResponse, SpringPage } from '@/types/api'
import type { FriendRequestStatus, SearchUser } from '@/types/friend'

export const USER_SEARCH_PAGE_SIZE = 5

export type UserSearchDto = {
  id: number
  fullName: string
  avatarUrl: string | null
  friendRequestStatus: FriendRequestStatus | null
  friendRequestSenderId: number | null
  cooldownAt: string | null
}

export type SearchUsersParams = {
  keyword?: string
  page?: number
  size?: number
}

export type SearchUsersResult = {
  users: SearchUser[]
  page: number
  totalPages: number
  totalElements: number
}

function mapSearchUser(dto: UserSearchDto): SearchUser {
  return {
    id: dto.id,
    fullName: dto.fullName,
    avatarUrl: dto.avatarUrl,
    friendRequestStatus: dto.friendRequestStatus,
    friendRequestSenderId: dto.friendRequestSenderId,
    cooldownAt: dto.cooldownAt,
  }
}

export async function searchUsers(
  params: SearchUsersParams = {},
): Promise<SearchUsersResult> {
  const keyword = params.keyword ?? ''
  const page = params.page ?? 0
  const size = params.size ?? USER_SEARCH_PAGE_SIZE

  const query = new URLSearchParams({
    keyword,
    page: String(page),
    size: String(size),
  })

  const response = await apiClient<ApiResponse<SpringPage<UserSearchDto>>>(
    `/api/users/search?${query}`,
  )

  const data = response.data

  return {
    users: data.content.map(mapSearchUser),
    page: data.number,
    totalPages: Math.max(1, data.totalPages),
    totalElements: data.totalElements,
  }
}
