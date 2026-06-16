import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'

export type CreateGroupPayload = {
  title: string
  avatarUrl: string | null
  memberIds: number[]
}

export type GroupMemberDto = {
  userId: number
  fullName: string
  avatarUrl: string | null
  memberRole: string
}

export type GroupInfoDto = {
  groupId: number
  title: string
  avatarUrl: string | null
  members: GroupMemberDto[]
}

export async function createGroup(payload: CreateGroupPayload): Promise<GroupInfoDto> {
  const response = await apiClient<ApiResponse<GroupInfoDto>>('/api/groups', {
    method: 'POST',
    body: payload,
  })
  return response.data
}

export async function fetchGroupInfo(groupId: number): Promise<GroupInfoDto> {
  const response = await apiClient<ApiResponse<GroupInfoDto>>(`/api/groups/${groupId}`)
  return response.data
}
