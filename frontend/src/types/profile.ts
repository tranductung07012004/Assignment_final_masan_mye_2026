export type Profile = {
  id: number
  email: string
  fullName: string
  avatarUrl: string | null
  createdAt: string
}

export type UpdateProfileRequest = {
  email: string
  fullName: string
  avatarUrl?: string | null
  oldPassword?: string
  newPassword?: string
  confirmNewPassword?: string
}

export type UpdateProfileResponse = {
  userId: number
  email: string
  fullName: string
  avatarUrl: string | null
}
