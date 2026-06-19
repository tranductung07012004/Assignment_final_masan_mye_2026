export const DEVICE_ID_HEADER = 'X-Device-Id'

const DEVICE_ID_KEY = 'device_id'

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }

  return deviceId
}

// Unique per browser tab/window. Kept in-memory (NOT localStorage), so each tab
// gets its own id and multiple tabs of the same browser no longer collide on the
// shared deviceId. Stays stable across reconnects within the tab (so the server can
// still clean up a stale socket of the SAME tab), and resets on a full page reload.
let connectionId: string | null = null

export function getConnectionId(): string {
  if (!connectionId) {
    connectionId = crypto.randomUUID()
  }
  return connectionId
}
