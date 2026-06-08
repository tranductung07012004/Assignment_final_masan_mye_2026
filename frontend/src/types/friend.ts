export type UserSummary = {
  id: number
  fullName: string
  email: string
  avatarUrl: string | null
}

export type FriendRequest = {
  id: number
  from: UserSummary
  sentAt: string
}

export type Friend = UserSummary & {
  friendsSince: string
}
