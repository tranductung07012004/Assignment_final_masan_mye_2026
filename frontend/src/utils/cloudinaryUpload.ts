import { getChatUploadSignature, type UploadSignatureDto } from '@/api/uploads'

export type CloudinaryUploadResult = {
  secureUrl: string
  publicId: string
  width: number
  height: number
  format: string
}

type CloudinaryUploadResponse = {
  secure_url: string
  public_id: string
  width?: number
  height?: number
  format: string
}

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

function uploadToCloudinary(
  file: File,
  sig: UploadSignatureDto,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', sig.uploadUrl)

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
          resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResponse)
        } catch {
          reject(new Error('Cloudinary upload failed'))
        }
        return
      }
      reject(new Error('Cloudinary upload failed'))
    }

    xhr.onerror = () => reject(new Error('Cloudinary upload failed'))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', sig.apiKey)
    formData.append('timestamp', String(sig.timestamp))
    formData.append('signature', sig.signature)
    formData.append('folder', sig.folder)

    xhr.send(formData)
  })
}

function toUploadResult(data: CloudinaryUploadResponse): CloudinaryUploadResult {
  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    width: data.width ?? 0,
    height: data.height ?? 0,
    format: data.format,
  }
}

export async function uploadChatImage(file: File): Promise<CloudinaryUploadResult> {
  const sig = await getChatUploadSignature('IMAGE')
  const data = await uploadToCloudinary(file, sig)
  return toUploadResult(data)
}

export async function uploadChatVideo(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUploadResult> {
  validateVideoFile(file)
  const sig = await getChatUploadSignature('VIDEO')
  const data = await uploadToCloudinary(file, sig, onProgress)
  return toUploadResult(data)
}
