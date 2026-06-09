import type { ChatListItem, ChatMessage, GroupMember } from '@/types/chat'
import { CURRENT_USER_ID } from '@/types/chat'

export const mockChatList: ChatListItem[] = [
  {
    groupId: 1,
    type: 'PRIVATE',
    title: 'Sarah Chen',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
  },
  {
    groupId: 2,
    type: 'GROUP',
    title: 'Dev Team',
    avatarUrl: 'https://api.dicebear.com/9.x/identicon/svg?seed=DevTeam',
  },
  {
    groupId: 3,
    type: 'PRIVATE',
    title: 'Michael Brooks',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Michael',
  },
  {
    groupId: 4,
    type: 'GROUP',
    title: 'Weekend Plans',
    avatarUrl: 'https://api.dicebear.com/9.x/identicon/svg?seed=Weekend',
  },
  {
    groupId: 5,
    type: 'GROUP',
    title: 'Book Club',
    avatarUrl: 'https://api.dicebear.com/9.x/identicon/svg?seed=BookClub',
  },
  {
    groupId: 6,
    type: 'PRIVATE',
    title: 'Emma Watson',
    avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Emma',
  },
  {
    groupId: 7,
    type: 'GROUP',
    title: 'Design Squad',
    avatarUrl: 'https://api.dicebear.com/9.x/identicon/svg?seed=DesignSquad',
  },
  {
    groupId: 8,
    type: 'GROUP',
    title: 'Study Group',
    avatarUrl: 'https://api.dicebear.com/9.x/identicon/svg?seed=StudyGroup',
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
      senderId: CURRENT_USER_ID,
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
      senderName: 'Emma Watson',
      content: 'Who is bringing snacks?',
      sentAt: '2026-06-07T14:20:00Z',
      isOwn: false,
    },
  ],
  5: [
    {
      id: 8,
      senderId: 2,
      senderName: 'Sarah Chen',
      content: 'Has everyone finished chapter 4?',
      sentAt: '2026-06-06T20:00:00Z',
      isOwn: false,
    },
  ],
  6: [
    {
      id: 9,
      senderId: 5,
      senderName: 'Emma Watson',
      content: 'See you on Saturday!',
      sentAt: '2026-06-06T15:00:00Z',
      isOwn: false,
    },
  ],
  7: [
    {
      id: 10,
      senderId: 2,
      senderName: 'Sarah Chen',
      content: 'Mockups are ready for review.',
      sentAt: '2026-06-05T11:30:00Z',
      isOwn: false,
    },
  ],
  8: [
    {
      id: 11,
      senderId: 4,
      senderName: 'Michael Brooks',
      content: 'Quiz is on Friday.',
      sentAt: '2026-06-04T19:00:00Z',
      isOwn: false,
    },
  ],
}

export const mockMembersByGroupId: Record<number, GroupMember[]> = {
  1: [
    {
      userId: CURRENT_USER_ID,
      fullName: 'Alex Morgan',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      role: 'MEMBER',
      isSelf: true,
    },
    {
      userId: 2,
      fullName: 'Sarah Chen',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
      role: 'MEMBER',
      isSelf: false,
    },
  ],
  2: [
    {
      userId: CURRENT_USER_ID,
      fullName: 'Alex Morgan',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      role: 'OWNER',
      isSelf: true,
    },
    {
      userId: 3,
      fullName: 'James',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=James',
      role: 'MEMBER',
      isSelf: false,
    },
    {
      userId: 4,
      fullName: 'Michael Brooks',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Michael',
      role: 'MEMBER',
      isSelf: false,
    },
  ],
  3: [
    {
      userId: CURRENT_USER_ID,
      fullName: 'Alex Morgan',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      role: 'MEMBER',
      isSelf: true,
    },
    {
      userId: 4,
      fullName: 'Michael Brooks',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Michael',
      role: 'MEMBER',
      isSelf: false,
    },
  ],
  4: [
    {
      userId: 5,
      fullName: 'Emma Watson',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Emma',
      role: 'OWNER',
      isSelf: false,
    },
    {
      userId: CURRENT_USER_ID,
      fullName: 'Alex Morgan',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      role: 'MEMBER',
      isSelf: true,
    },
    {
      userId: 2,
      fullName: 'Sarah Chen',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
      role: 'MEMBER',
      isSelf: false,
    },
  ],
  5: [
    {
      userId: CURRENT_USER_ID,
      fullName: 'Alex Morgan',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      role: 'OWNER',
      isSelf: true,
    },
    {
      userId: 2,
      fullName: 'Sarah Chen',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
      role: 'MEMBER',
      isSelf: false,
    },
    {
      userId: 5,
      fullName: 'Emma Watson',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Emma',
      role: 'MEMBER',
      isSelf: false,
    },
  ],
  6: [
    {
      userId: CURRENT_USER_ID,
      fullName: 'Alex Morgan',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      role: 'MEMBER',
      isSelf: true,
    },
    {
      userId: 5,
      fullName: 'Emma Watson',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Emma',
      role: 'MEMBER',
      isSelf: false,
    },
  ],
  7: [
    {
      userId: CURRENT_USER_ID,
      fullName: 'Alex Morgan',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      role: 'OWNER',
      isSelf: true,
    },
    {
      userId: 2,
      fullName: 'Sarah Chen',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
      role: 'MEMBER',
      isSelf: false,
    },
  ],
  8: [
    {
      userId: CURRENT_USER_ID,
      fullName: 'Alex Morgan',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      role: 'MEMBER',
      isSelf: true,
    },
    {
      userId: 4,
      fullName: 'Michael Brooks',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Michael',
      role: 'OWNER',
      isSelf: false,
    },
    {
      userId: 2,
      fullName: 'Sarah Chen',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sarah',
      role: 'MEMBER',
      isSelf: false,
    },
  ],
}

export const INITIAL_NEXT_GROUP_ID = 100
export const INITIAL_NEXT_MESSAGE_ID = 1000
