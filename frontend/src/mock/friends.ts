import type { Friend, FriendRequest } from '@/types/friend'

export const mockFriendRequests: FriendRequest[] = [
  {
    id: 1,
    from: {
      id: 20,
      fullName: 'Chris Taylor',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chris',
    },
    sentAt: '2026-06-08T07:00:00Z',
  },
  {
    id: 2,
    from: {
      id: 21,
      fullName: 'Olivia Martinez',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Olivia',
    },
    sentAt: '2026-06-07T16:30:00Z',
  },
  {
    id: 3,
    from: {
      id: 22,
      fullName: 'Daniel Lee',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Daniel',
    },
    sentAt: '2026-06-07T10:00:00Z',
  },
  {
    id: 4,
    from: {
      id: 23,
      fullName: 'Hannah Scott',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Hannah',
    },
    sentAt: '2026-06-06T14:20:00Z',
  },
  {
    id: 5,
    from: {
      id: 24,
      fullName: 'Marcus Johnson',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Marcus',
    },
    sentAt: '2026-06-05T09:45:00Z',
  },
  {
    id: 6,
    from: {
      id: 25,
      fullName: 'Priya Shah',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya',
    },
    sentAt: '2026-06-04T18:10:00Z',
  },
  {
    id: 7,
    from: {
      id: 26,
      fullName: 'Lucas Brown',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Lucas',
    },
    sentAt: '2026-06-03T12:30:00Z',
  },
]

export const mockFriends: Friend[] = [
  {
    id: 2,
    fullName: 'Sarah Chen',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
    createdAt: '2025-03-10T12:00:00Z',
  },
  {
    id: 4,
    fullName: 'Michael Brooks',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Michael',
    createdAt: '2025-05-22T09:00:00Z',
  },
  {
    id: 5,
    fullName: 'Emma Watson',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Emma',
    createdAt: '2025-08-01T14:30:00Z',
  },
  {
    id: 30,
    fullName: 'James Wilson',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=JamesW',
    createdAt: '2025-09-12T10:00:00Z',
  },
  {
    id: 31,
    fullName: 'Anna Clark',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Anna',
    createdAt: '2025-10-01T16:00:00Z',
  },
  {
    id: 32,
    fullName: 'Ben Foster',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ben',
    createdAt: '2025-11-05T08:30:00Z',
  },
  {
    id: 33,
    fullName: 'Chloe Adams',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chloe',
    createdAt: '2025-12-20T11:15:00Z',
  },
  {
    id: 34,
    fullName: 'Ethan Moore',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ethan',
    createdAt: '2026-01-08T13:45:00Z',
  },
  {
    id: 35,
    fullName: 'Fiona Reed',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Fiona',
    createdAt: '2026-02-14T09:00:00Z',
  },
]
