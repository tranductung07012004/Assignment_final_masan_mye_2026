import { useAuthStore } from '@/stores/authStore'
import type { ApiResponse } from '@/types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

type ApiErrorBody = {
  message?: string
  data?: {
    errorCode?: string
  }
}

let refreshPromise: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) return null

        const body = (await response.json()) as ApiResponse<string>
        const token = body.data
        useAuthStore.getState().setAccessToken(token)
        return token
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

async function executeRequest(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const { body, headers, ...rest } = options
  const accessToken = useAuthStore.getState().accessToken

  return fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const response = await executeRequest(path, options)

  if (!response.ok) {
    const errorBody = (await response.json().catch(
      () => null,
    )) as ApiErrorBody | null

    const shouldRefresh =
      response.status === 401 &&
      errorBody?.data?.errorCode === 'INVALID_ACCESS_TOKEN' &&
      !retried &&
      !path.startsWith('/api/auth/refresh')

    if (shouldRefresh) {
      const newToken = await refreshAccessToken()

      if (newToken) {
        return apiClient<T>(path, options, true)
      }

      useAuthStore.getState().clearAccessToken()
    }

    throw new Error(
      errorBody?.message ?? `Request failed with status ${response.status}`,
    )
  }

  return response.json() as Promise<T>
}
