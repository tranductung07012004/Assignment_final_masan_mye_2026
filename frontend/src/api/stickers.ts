import { STICKERS_CATALOG_URL } from '@/constants/stickers'
import type { Sticker } from '@/types/sticker'

function isSticker(value: unknown): value is Sticker {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'url' in value &&
    typeof value.id === 'string' &&
    typeof value.url === 'string'
  )
}

export async function fetchStickersCatalog(): Promise<Sticker[]> {
  const response = await fetch(STICKERS_CATALOG_URL)

  if (!response.ok) {
    throw new Error(`Failed to load stickers (${response.status})`)
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    throw new Error('Invalid stickers catalog format')
  }

  const stickers = data.filter(isSticker)

  if (stickers.length === 0) {
    throw new Error('Stickers catalog is empty')
  }

  return stickers
}
