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

export async function getChatUploadSignature(
  resourceType: 'IMAGE' | 'VIDEO' = 'IMAGE',
): Promise<UploadSignatureDto> {
  const query = resourceType === 'VIDEO' ? '?resourceType=VIDEO' : ''
  const response = await apiClient<ApiResponse<UploadSignatureDto>>(
    `/api/uploads/signature${query}`,
    { method: 'POST' },
  )
  return response.data
}
