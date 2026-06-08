import type { Friend, FriendRequest } from '@/types/friend'

export const mockFriendRequests: FriendRequest[] = [
  {
    id: 1,
    from: {
      id: 20,
      fullName: 'Chris Taylor',
      email: 'chris.taylor@example.com',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chris',
    },
    sentAt: '2026-06-08T07:00:00Z',
  },
  {
    id: 2,
    from: {
      id: 21,
      fullName: 'Olivia Martinez',
      email: 'olivia.martinez@example.com',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Olivia',
    },
    sentAt: '2026-06-07T16:30:00Z',
  },
]

export const mockFriends: Friend[] = [
  {
    id: 2,
    fullName: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
    friendsSince: '2025-03-10T12:00:00Z',
  },
  {
    id: 4,
    fullName: 'Michael Brooks',
    email: 'michael.brooks@example.com',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Michael',
    friendsSince: '2025-05-22T09:00:00Z',
  },
  {
    id: 5,
    fullName: 'Emma Watson',
    email: 'emma.watson@example.com',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Emma',
    friendsSince: '2025-08-01T14:30:00Z',
  },
]
