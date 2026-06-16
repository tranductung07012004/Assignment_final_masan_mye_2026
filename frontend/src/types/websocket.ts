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
