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
  {
    id: 3,
    from: {
      id: 22,
      fullName: 'Daniel Lee',
      email: 'daniel.lee@example.com',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Daniel',
    },
    sentAt: '2026-06-07T10:00:00Z',
  },
  {
    id: 4,
    from: {
      id: 23,
      fullName: 'Hannah Scott',
      email: 'hannah.scott@example.com',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Hannah',
    },
    sentAt: '2026-06-06T14:20:00Z',
  },
  {
    id: 5,
    from: {
      id: 24,
      fullName: 'Marcus Johnson',
      email: 'marcus.johnson@example.com',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Marcus',
    },
    sentAt: '2026-06-05T09:45:00Z',
  },
  {
    id: 6,
    from: {
      id: 25,
      fullName: 'Priya Shah',
      email: 'priya.shah@example.com',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Priya',
    },
    sentAt: '2026-06-04T18:10:00Z',
  },
  {
    id: 7,
    from: {
      id: 26,
      fullName: 'Lucas Brown',
      email: 'lucas.brown@example.com',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Lucas',
    },
    sentAt: '2026-06-03T12:30:00Z',
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
  {
    id: 30,
    fullName: 'James Wilson',
    email: 'james.wilson@example.com',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=JamesW',
    friendsSince: '2025-09-12T10:00:00Z',
  },
  {
    id: 31,
    fullName: 'Anna Clark',
    email: 'anna.clark@example.com',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Anna',
    friendsSince: '2025-10-01T16:00:00Z',
  },
  {
    id: 32,
    fullName: 'Ben Foster',
    email: 'ben.foster@example.com',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ben',
    friendsSince: '2025-11-05T08:30:00Z',
  },
  {
    id: 33,
    fullName: 'Chloe Adams',
    email: 'chloe.adams@example.com',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chloe',
    friendsSince: '2025-12-20T11:15:00Z',
  },
  {
    id: 34,
    fullName: 'Ethan Moore',
    email: 'ethan.moore@example.com',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Ethan',
    friendsSince: '2026-01-08T13:45:00Z',
  },
  {
    id: 35,
    fullName: 'Fiona Reed',
    email: 'fiona.reed@example.com',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Fiona',
    friendsSince: '2026-02-14T09:00:00Z',
  },
]
