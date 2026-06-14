import { getChatUploadSignature } from '@/api/uploads'

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
  width: number
  height: number
  format: string
}

export async function uploadChatImage(file: File): Promise<CloudinaryUploadResult> {
  const sig = await getChatUploadSignature()

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', sig.apiKey)
  formData.append('timestamp', String(sig.timestamp))
  formData.append('signature', sig.signature)
  formData.append('folder', sig.folder)

  const response = await fetch(sig.uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Cloudinary upload failed')
  }

  const data = (await response.json()) as CloudinaryUploadResponse

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
  }
}
