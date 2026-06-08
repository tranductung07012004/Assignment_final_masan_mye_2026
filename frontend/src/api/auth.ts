import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from '@/types/auth'

export async function login(payload: LoginRequest): Promise<string> {
  const response = await apiClient<ApiResponse<string>>('/api/auth/login', {
    method: 'POST',
    body: payload,
  })

  return response.data
}

export async function register(
  payload: RegisterRequest,
): Promise<RegisterResponse> {
  const response = await apiClient<ApiResponse<RegisterResponse>>(
    '/api/auth/register',
    {
      method: 'POST',
      body: payload,
    },
  )

  return response.data
}

export async function logout(): Promise<void> {
  await apiClient<ApiResponse<null>>('/api/auth/logout', {
    method: 'POST',
  })
}
