import { getProfile, updateProfile as updateProfileApi } from '@/api/profile'
import { mockProfile } from '@/mock/profile'
import type { Profile, UpdateProfileRequest } from '@/types/profile'
import { create } from 'zustand'

type ProfileState = {
  profile: Profile | null
  isLoading: boolean
  isFromMock: boolean
  fetchProfile: () => Promise<void>
  updateProfile: (payload: UpdateProfileRequest) => Promise<void>
  clearProfile: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  isFromMock: false,

  fetchProfile: async () => {
    set({ isLoading: true })
    try {
      const profile = await getProfile()
      set({ profile, isFromMock: false })
    } catch {
      set({ profile: mockProfile, isFromMock: true })
    } finally {
      set({ isLoading: false })
    }
  },

  updateProfile: async (payload) => {
    const { isFromMock } = get()

    if (isFromMock) {
      set({
        profile: {
          id: get().profile?.id ?? 0,
          email: payload.email,
          fullName: payload.fullName,
          avatarUrl: payload.avatarUrl ?? null,
          createdAt: get().profile?.createdAt ?? new Date().toISOString(),
        },
      })
      return
    }

    const updated = await updateProfileApi(payload)
    set({
      profile: {
        id: updated.userId,
        email: updated.email,
        fullName: updated.fullName,
        avatarUrl: updated.avatarUrl,
        createdAt: get().profile?.createdAt ?? new Date().toISOString(),
      },
    })
  },

  clearProfile: () => set({ profile: null, isFromMock: false }),
}))
