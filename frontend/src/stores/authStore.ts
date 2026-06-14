import { logout as logoutApi } from '@/api/auth'
import { refreshAccessToken } from '@/api/client'
import { create } from 'zustand'

type AuthState = {
  accessToken: string | null
  isBootstrapping: boolean
  setAccessToken: (token: string) => void
  clearAccessToken: () => void
  bootstrapSession: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  isBootstrapping: true,
  setAccessToken: (token) => set({ accessToken: token }),
  clearAccessToken: () => set({ accessToken: null }),
  bootstrapSession: async () => {
    set({ isBootstrapping: true })

    try {
      if (!get().accessToken) {
        await refreshAccessToken()
      }
    } finally {
      set({ isBootstrapping: false })
    }
  },
  logout: async () => {
    try {
      await logoutApi()
    } catch {
      // Clear local session even when the API call fails.
    } finally {
      set({ accessToken: null })
    }
  },
}))
