import {
  INITIAL_NEXT_GROUP_ID,
  INITIAL_NEXT_MESSAGE_ID,
  mockChatList,
  mockMembersByGroupId,
  mockMessagesByGroupId,
} from '@/mock/chats'
import { mockFriends } from '@/mock/friends'
import { mockProfile } from '@/mock/profile'
import type {
  ChatListItem,
  ChatMessage,
  CreateGroupInput,
  GroupMember,
} from '@/types/chat'
import { CURRENT_USER_ID, MAX_GROUP_MEMBERS } from '@/types/chat'
import { create } from 'zustand'

type ChatState = {
  chats: ChatListItem[]
  messagesByGroupId: Record<number, ChatMessage[]>
  membersByGroupId: Record<number, GroupMember[]>
  selectedGroupId: number | null
  nextGroupId: number
  nextMessageId: number

  selectChat: (groupId: number) => void
  getMessages: (groupId: number) => ChatMessage[]
  getMembers: (groupId: number) => GroupMember[]
  isCurrentUserOwner: (groupId: number) => boolean
  createGroup: (input: CreateGroupInput) => number
  createPrivateChat: (friendId: number) => number
  addMemberToGroup: (groupId: number, friendId: number) => void
  removeMemberFromGroup: (groupId: number, memberId: number) => void
  leaveGroup: (groupId: number) => void
  getAddableFriends: (groupId: number) => typeof mockFriends
}

function getPrivateChatPeerId(chat: ChatListItem, members: GroupMember[]): number | null {
  if (chat.type !== 'PRIVATE') return null
  const peer = members.find((m) => !m.isSelf)
  return peer?.userId ?? null
}

function cloneRecord<T>(record: Record<number, T[]>): Record<number, T[]> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [Number(key), [...value]]),
  )
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [...mockChatList],
  messagesByGroupId: cloneRecord(mockMessagesByGroupId),
  membersByGroupId: cloneRecord(mockMembersByGroupId),
  selectedGroupId: null,
  nextGroupId: INITIAL_NEXT_GROUP_ID,
  nextMessageId: INITIAL_NEXT_MESSAGE_ID,

  selectChat: (groupId) => set({ selectedGroupId: groupId }),

  getMessages: (groupId) => get().messagesByGroupId[groupId] ?? [],

  getMembers: (groupId) => get().membersByGroupId[groupId] ?? [],

  isCurrentUserOwner: (groupId) => {
    const members = get().membersByGroupId[groupId] ?? []
    return members.some((m) => m.isSelf && m.role === 'OWNER')
  },

  createPrivateChat: (friendId) => {
    const friend = mockFriends.find((f) => f.id === friendId)
    if (!friend) return get().selectedGroupId ?? 0

    const existing = get().chats.find((chat) => {
      if (chat.type !== 'PRIVATE') return false
      const peerId = getPrivateChatPeerId(
        chat,
        get().membersByGroupId[chat.groupId] ?? [],
      )
      return peerId === friendId
    })

    if (existing) {
      set({ selectedGroupId: existing.groupId })
      return existing.groupId
    }

    const groupId = get().nextGroupId

    const newChat: ChatListItem = {
      groupId,
      type: 'PRIVATE',
      title: friend.fullName,
      avatarUrl: friend.avatarUrl,
    }

    const members: GroupMember[] = [
      {
        userId: CURRENT_USER_ID,
        fullName: mockProfile.fullName,
        avatarUrl: mockProfile.avatarUrl,
        role: 'MEMBER',
        isSelf: true,
      },
      {
        userId: friend.id,
        fullName: friend.fullName,
        avatarUrl: friend.avatarUrl,
        role: 'MEMBER',
        isSelf: false,
      },
    ]

    set((state) => ({
      chats: [newChat, ...state.chats],
      membersByGroupId: { ...state.membersByGroupId, [groupId]: members },
      messagesByGroupId: { ...state.messagesByGroupId, [groupId]: [] },
      selectedGroupId: groupId,
      nextGroupId: state.nextGroupId + 1,
    }))

    return groupId
  },

  createGroup: (input) => {
    const groupId = get().nextGroupId
    const now = new Date().toISOString()

    const selectedFriends = mockFriends.filter((f) => input.friendIds.includes(f.id))

    const members: GroupMember[] = [
      {
        userId: CURRENT_USER_ID,
        fullName: mockProfile.fullName,
        avatarUrl: mockProfile.avatarUrl,
        role: 'OWNER',
        isSelf: true,
      },
      ...selectedFriends.map(
        (friend): GroupMember => ({
          userId: friend.id,
          fullName: friend.fullName,
          avatarUrl: friend.avatarUrl,
          role: 'MEMBER',
          isSelf: false,
        }),
      ),
    ]

    const newChat: ChatListItem = {
      groupId,
      type: 'GROUP',
      title: input.title.trim(),
      avatarUrl: input.avatarUrl,
    }

    const welcomeMessage: ChatMessage = {
      id: get().nextMessageId,
      senderId: CURRENT_USER_ID,
      senderName: mockProfile.fullName,
      content: 'Group created',
      sentAt: now,
      isOwn: true,
    }

    set((state) => ({
      chats: [newChat, ...state.chats],
      membersByGroupId: { ...state.membersByGroupId, [groupId]: members },
      messagesByGroupId: {
        ...state.messagesByGroupId,
        [groupId]: [welcomeMessage],
      },
      selectedGroupId: groupId,
      nextGroupId: state.nextGroupId + 1,
      nextMessageId: state.nextMessageId + 1,
    }))

    return groupId
  },

  addMemberToGroup: (groupId, friendId) => {
    const state = get()
    const members = state.membersByGroupId[groupId]
    if (!members) return

    if (!state.isCurrentUserOwner(groupId)) return
    if (members.length >= MAX_GROUP_MEMBERS) return
    if (members.some((m) => m.userId === friendId)) return

    const friend = mockFriends.find((f) => f.id === friendId)
    if (!friend) return

    set({
      membersByGroupId: {
        ...state.membersByGroupId,
        [groupId]: [
          ...members,
          {
            userId: friend.id,
            fullName: friend.fullName,
            avatarUrl: friend.avatarUrl,
            role: 'MEMBER',
            isSelf: false,
          },
        ],
      },
    })
  },

  removeMemberFromGroup: (groupId, memberId) => {
    const state = get()
    const members = state.membersByGroupId[groupId]
    if (!members) return

    if (!state.isCurrentUserOwner(groupId)) return
    if (memberId === CURRENT_USER_ID) return

    set({
      membersByGroupId: {
        ...state.membersByGroupId,
        [groupId]: members.filter((m) => m.userId !== memberId),
      },
    })
  },

  leaveGroup: (groupId) => {
    const state = get()
    const chat = state.chats.find((c) => c.groupId === groupId)
    if (!chat || chat.type !== 'GROUP') return

    const remainingChats = state.chats.filter((c) => c.groupId !== groupId)
    const nextSelected =
      state.selectedGroupId === groupId
        ? (remainingChats[0]?.groupId ?? null)
        : state.selectedGroupId

    const { [groupId]: _members, ...restMembers } = state.membersByGroupId
    const { [groupId]: _messages, ...restMessages } = state.messagesByGroupId

    set({
      chats: remainingChats,
      membersByGroupId: restMembers,
      messagesByGroupId: restMessages,
      selectedGroupId: nextSelected,
    })
  },

  getAddableFriends: (groupId) => {
    const members = get().membersByGroupId[groupId] ?? []
    const memberIds = new Set(members.map((m) => m.userId))
    return mockFriends.filter((f) => !memberIds.has(f.id))
  },
}))
