import { apiClient } from '@/api/client'
import type { ApiResponse } from '@/types/api'

export type UploadSignatureDto = {
  signature: string
  timestamp: number
  apiKey: string
  cloudName: string
  uploadUrl: string
  folder: string
}

export async function getChatUploadSignature(): Promise<UploadSignatureDto> {
  const response = await apiClient<ApiResponse<UploadSignatureDto>>(
    '/api/uploads/signature',
    { method: 'POST' },
  )
  return response.data
}
