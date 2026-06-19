import { refreshAccessToken } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export type UploadResult = {
  url: string
}

type ApiResponseBody = {
  message?: string
  data?: { url?: string }
}

type UploadError = Error & { status?: number }

const MAX_VIDEO_BYTES = 30 * 1024 * 1024

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const

export function validateVideoFile(file: File): void {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_VIDEO_TYPES)[number])) {
    throw new Error('Unsupported video format. Use MP4, WebM, or MOV.')
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error('Video must be 30MB or smaller.')
  }
}

function uploadRequest(
  file: File,
  resourceType: 'IMAGE' | 'VIDEO',
  token: string | null,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}/api/uploads?resourceType=${resourceType}`)
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText) as ApiResponseBody
          const url = body.data?.url
          if (!url) throw new Error('missing url')
          resolve({ url })
        } catch {
          reject(new Error('Upload failed'))
        }
        return
      }

      let message = 'Upload failed'
      try {
        message = (JSON.parse(xhr.responseText) as ApiResponseBody).message ?? message
      } catch {
        // ignore non-JSON error body
      }
      const error: UploadError = Object.assign(new Error(message), { status: xhr.status })
      reject(error)
    }

    xhr.onerror = () => reject(new Error('Upload failed'))

    const formData = new FormData()
    formData.append('file', file)
    xhr.send(formData)
  })
}

async function upload(
  file: File,
  resourceType: 'IMAGE' | 'VIDEO',
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const token = useAuthStore.getState().accessToken
  try {
    return await uploadRequest(file, resourceType, token, onProgress)
  } catch (err) {
    if (err && typeof err === 'object' && (err as UploadError).status === 401) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        return uploadRequest(file, resourceType, newToken, onProgress)
      }
    }
    throw err instanceof Error ? err : new Error('Upload failed')
  }
}

export async function uploadChatImage(file: File): Promise<UploadResult> {
  return upload(file, 'IMAGE')
}

export async function uploadChatVideo(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  validateVideoFile(file)
  return upload(file, 'VIDEO', onProgress)
}
