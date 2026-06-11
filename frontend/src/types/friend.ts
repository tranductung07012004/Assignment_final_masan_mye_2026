export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export type UserSummary = {
  id: number
  fullName: string
  avatarUrl: string | null
}

export type SearchUser = {
  id: number
  fullName: string
  avatarUrl: string | null
  friendRequestStatus: FriendRequestStatus | null
  friendRequestSenderId: number | null
  cooldownAt: string | null
}

export type FriendRequest = {
  id: number
  from: UserSummary
  sentAt: string
}

export type Friend = {
  id: number
  fullName: string
  avatarUrl: string | null
  createdAt: string
}
