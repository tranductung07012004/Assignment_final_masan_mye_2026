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
  LastMessageEntry,
} from '@/types/chat'
import { CURRENT_USER_ID } from '@/types/chat'
import { create } from 'zustand'

type ChatState = {
  chats: ChatListItem[]
  messagesByGroupId: Record<number, ChatMessage[]>
  nextCursorByGroupId: Record<number, number | null>
  membersByGroupId: Record<number, GroupMember[]>
  selectedGroupId: number | null
  nextGroupId: number
  nextMessageId: number
  unreadCounts: Record<number, number>
  lastMessageByGroupId: Record<number, LastMessageEntry>
  presenceById: Record<number, boolean>

  selectChat: (groupId: number) => void
  getMessages: (groupId: number) => ChatMessage[]
  getMembers: (groupId: number) => GroupMember[]
  isCurrentUserOwner: (groupId: number) => boolean
  createGroup: (input: CreateGroupInput) => number
  createPrivateChat: (friendId: number) => number
  leaveGroup: (groupId: number) => void
  setLastMessages: (chats: ChatListItem[]) => void
  setUnreadCounts: (counts: Record<string, number>) => void
  setMembers: (groupId: number, members: GroupMember[]) => void
  setPresence: (userId: number, online: boolean) => void
  mergePresence: (statuses: Record<string, boolean>) => void
  incrementUnread: (groupId: number) => void
  clearUnread: (groupId: number) => void
  setMessages: (groupId: number, messages: ChatMessage[], nextCursor: number | null) => void
  prependMessages: (groupId: number, messages: ChatMessage[], nextCursor: number | null) => void
  appendMessage: (message: ChatMessage) => void
  updateLastMessage: (groupId: number, payload: LastMessageEntry) => void
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
  nextCursorByGroupId: {},
  membersByGroupId: cloneRecord(mockMembersByGroupId),
  selectedGroupId: null,
  nextGroupId: INITIAL_NEXT_GROUP_ID,
  nextMessageId: INITIAL_NEXT_MESSAGE_ID,
  unreadCounts: {},
  lastMessageByGroupId: {},
  presenceById: {},

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
      groupId,
      senderId: CURRENT_USER_ID,
      senderName: mockProfile.fullName,
      senderAvatarUrl: mockProfile.avatarUrl,
      content: 'Group created',
      messageType: 'TEXT',
      sentAt: now,
      isOwn: true,
      isDeleted: false,
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

  setLastMessages: (chats) =>
    set(() => {
      const map: Record<number, LastMessageEntry> = {}
      for (const chat of chats) {
        if (chat.lastMessageType) {
          map[chat.groupId] = {
            content: chat.lastMessageContent ?? null,
            type: chat.lastMessageType,
            at: chat.lastMessageAt ?? '',
            senderId: chat.lastMessageSenderId ?? 0,
            senderName: chat.lastMessageSenderName ?? null,
          }
        }
      }
      return { lastMessageByGroupId: map }
    }),

  setUnreadCounts: (counts) =>
    set(() => {
      const parsed: Record<number, number> = {}
      for (const [k, v] of Object.entries(counts)) {
        parsed[Number(k)] = v
      }
      return { unreadCounts: parsed }
    }),

  incrementUnread: (groupId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [groupId]: (state.unreadCounts[groupId] ?? 0) + 1,
      },
    })),

  clearUnread: (groupId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [groupId]: 0 },
    })),

  setMessages: (groupId, messages, nextCursor) =>
    set((state) => ({
      messagesByGroupId: { ...state.messagesByGroupId, [groupId]: messages },
      nextCursorByGroupId: { ...state.nextCursorByGroupId, [groupId]: nextCursor },
    })),

  prependMessages: (groupId, messages, nextCursor) =>
    set((state) => {
      const existing = state.messagesByGroupId[groupId] ?? []
      const existingIds = new Set(existing.map((m) => m.id))
      const unique = messages.filter((m) => !existingIds.has(m.id))
      return {
        messagesByGroupId: {
          ...state.messagesByGroupId,
          [groupId]: [...unique, ...existing],
        },
        nextCursorByGroupId: { ...state.nextCursorByGroupId, [groupId]: nextCursor },
      }
    }),

  appendMessage: (message) =>
    set((state) => {
      const existing = state.messagesByGroupId[message.groupId] ?? []
      if (existing.some((m) => m.id === message.id)) return state
      return {
        messagesByGroupId: {
          ...state.messagesByGroupId,
          [message.groupId]: [...existing, message],
        },
      }
    }),
  updateLastMessage: (groupId, payload) =>
    set((state) => ({
      lastMessageByGroupId: { ...state.lastMessageByGroupId, [groupId]: payload },
    })),

  setMembers: (groupId, members) =>
    set((state) => ({
      membersByGroupId: { ...state.membersByGroupId, [groupId]: members },
    })),

  setPresence: (userId, online) =>
    set((state) => ({
      presenceById: { ...state.presenceById, [userId]: online },
    })),

  mergePresence: (statuses) =>
    set((state) => {
      const updates: Record<number, boolean> = {}
      for (const [k, v] of Object.entries(statuses)) {
        updates[Number(k)] = v
      }
      return { presenceById: { ...state.presenceById, ...updates } }
    }),
}))
