import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  Profile,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '@/types/profile'

type ProfileDto = {
  userId: number
  email: string
  fullName: string
  avatarUrl: string | null
  createdAt: string
}

export async function getProfile(): Promise<Profile> {
  const response = await apiClient<ApiResponse<ProfileDto>>('/api/profile')
  const dto = response.data

  return {
    id: dto.userId,
    email: dto.email,
    fullName: dto.fullName,
    avatarUrl: dto.avatarUrl,
    createdAt: dto.createdAt,
  }
}

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<UpdateProfileResponse> {
  const response = await apiClient<ApiResponse<UpdateProfileResponse>>(
    '/api/profile',
    {
      method: 'PUT',
      body: payload,
    },
  )
  return response.data
}
