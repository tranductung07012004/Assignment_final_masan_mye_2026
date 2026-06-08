import type { ChatListItem, ChatMessage } from '@/types/chat'

export const mockChatList: ChatListItem[] = [
  {
    groupId: 1,
    title: 'Sarah Chen',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
    lastMessage: 'See you at the meeting tomorrow!',
    lastMessageAt: '2026-06-08T10:30:00Z',
    unreadCount: 2,
  },
  {
    groupId: 2,
    title: 'Dev Team',
    avatarUrl: 'https://api.dicebear.com/9.x/identicon/svg?seed=DevTeam',
    lastMessage: 'James: The deploy is done.',
    lastMessageAt: '2026-06-08T09:15:00Z',
    unreadCount: 0,
  },
  {
    groupId: 3,
    title: 'Michael Brooks',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Michael',
    lastMessage: 'Thanks for the help!',
    lastMessageAt: '2026-06-07T18:45:00Z',
    unreadCount: 0,
  },
  {
    groupId: 4,
    title: 'Weekend Plans',
    avatarUrl: 'https://api.dicebear.com/9.x/identicon/svg?seed=Weekend',
    lastMessage: 'Emma: Who is bringing snacks?',
    lastMessageAt: '2026-06-07T14:20:00Z',
    unreadCount: 5,
  },
]

export const mockMessagesByGroupId: Record<number, ChatMessage[]> = {
  1: [
    {
      id: 1,
      senderId: 2,
      senderName: 'Sarah Chen',
      content: 'Hey Alex, are we still on for lunch?',
      sentAt: '2026-06-08T09:00:00Z',
      isOwn: false,
    },
    {
      id: 2,
      senderId: 1,
      senderName: 'Alex Morgan',
      content: 'Yes! How about noon at the usual place?',
      sentAt: '2026-06-08T09:05:00Z',
      isOwn: true,
    },
    {
      id: 3,
      senderId: 2,
      senderName: 'Sarah Chen',
      content: 'Perfect. See you at the meeting tomorrow!',
      sentAt: '2026-06-08T10:30:00Z',
      isOwn: false,
    },
  ],
  2: [
    {
      id: 4,
      senderId: 3,
      senderName: 'James',
      content: 'Starting the deploy now.',
      sentAt: '2026-06-08T08:50:00Z',
      isOwn: false,
    },
    {
      id: 5,
      senderId: 3,
      senderName: 'James',
      content: 'The deploy is done.',
      sentAt: '2026-06-08T09:15:00Z',
      isOwn: false,
    },
  ],
  3: [
    {
      id: 6,
      senderId: 4,
      senderName: 'Michael Brooks',
      content: 'Thanks for the help!',
      sentAt: '2026-06-07T18:45:00Z',
      isOwn: false,
    },
  ],
  4: [
    {
      id: 7,
      senderId: 5,
      senderName: 'Emma',
      content: 'Who is bringing snacks?',
      sentAt: '2026-06-07T14:20:00Z',
      isOwn: false,
    },
  ],
}
