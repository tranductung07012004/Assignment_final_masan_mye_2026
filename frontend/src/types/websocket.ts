export type UnreadSnapshot = {
  type: 'UNREAD_SNAPSHOT'
  counts: Record<string, number>
}

export type MarkRead = {
  type: 'MARK_READ'
  groupId: number
  lastReadMsgId: number
}

export type ReadSync = {
  type: 'READ_SYNC'
  groupId: number
  count: number
}

export type Presence = {
  type: 'PRESENCE'
  userId: number
  status: 'ONLINE' | 'OFFLINE'
}

export type PresenceSnapshot = {
  type: 'PRESENCE_SNAPSHOT'
  statuses: Record<string, boolean>
}

export type PresenceQuery = {
  type: 'PRESENCE_QUERY'
  userIds: number[]
}
