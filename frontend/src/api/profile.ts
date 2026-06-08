import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  Profile,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '@/types/profile'

export async function getProfile(): Promise<Profile> {
  const response = await apiClient<ApiResponse<Profile>>('/api/profile')
  return response.data
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
