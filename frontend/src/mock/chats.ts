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

function msg(
  id: number,
  groupId: number,
  senderId: number,
  senderName: string,
  content: string,
  sentAt: string,
  isOwn: boolean,
): ChatMessage {
  return { id, groupId, senderId, senderName, senderAvatarUrl: null, content, sentAt, isOwn, isDeleted: false }
}

export const mockMessagesByGroupId: Record<number, ChatMessage[]> = {
  1: [
    msg(1, 1, 2, 'Sarah Chen', 'Hey Alex, are we still on for lunch?', '2026-06-08T09:00:00Z', false),
    msg(2, 1, CURRENT_USER_ID, 'Alex Morgan', 'Yes! How about noon at the usual place?', '2026-06-08T09:05:00Z', true),
    msg(3, 1, 2, 'Sarah Chen', 'Perfect. See you at the meeting tomorrow!', '2026-06-08T10:30:00Z', false),
  ],
  2: [
    msg(4, 2, 3, 'James', 'Starting the deploy now.', '2026-06-08T08:50:00Z', false),
    msg(5, 2, 3, 'James', 'The deploy is done.', '2026-06-08T09:15:00Z', false),
  ],
  3: [
    msg(6, 3, 4, 'Michael Brooks', 'Thanks for the help!', '2026-06-07T18:45:00Z', false),
  ],
  4: [
    msg(7, 4, 5, 'Emma Watson', 'Who is bringing snacks?', '2026-06-07T14:20:00Z', false),
  ],
  5: [
    msg(8, 5, 2, 'Sarah Chen', 'Has everyone finished chapter 4?', '2026-06-06T20:00:00Z', false),
  ],
  6: [
    msg(9, 6, 5, 'Emma Watson', 'See you on Saturday!', '2026-06-06T15:00:00Z', false),
  ],
  7: [
    msg(10, 7, 2, 'Sarah Chen', 'Mockups are ready for review.', '2026-06-05T11:30:00Z', false),
  ],
  8: [
    msg(11, 8, 4, 'Michael Brooks', 'Quiz is on Friday.', '2026-06-04T19:00:00Z', false),
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
