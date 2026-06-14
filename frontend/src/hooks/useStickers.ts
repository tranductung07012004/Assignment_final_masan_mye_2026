import { useCallback, useEffect, useState } from 'react'
import { fetchStickersCatalog } from '@/api/stickers'
import type { Sticker } from '@/types/sticker'

let cachedStickers: Sticker[] | null = null
let inflightRequest: Promise<Sticker[]> | null = null

async function loadStickers(): Promise<Sticker[]> {
  if (cachedStickers) {
    return cachedStickers
  }

  if (!inflightRequest) {
    inflightRequest = fetchStickersCatalog()
      .then((stickers) => {
        cachedStickers = stickers
        return stickers
      })
      .finally(() => {
        inflightRequest = null
      })
  }

  return inflightRequest
}

export function useStickers() {
  const [stickers, setStickers] = useState<Sticker[]>(cachedStickers ?? [])
  const [stickerById, setStickerById] = useState<Record<string, string>>(() => {
    if (!cachedStickers) return {}
    return Object.fromEntries(cachedStickers.map((s) => [s.id, s.url]))
  })
  const [loading, setLoading] = useState(cachedStickers === null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    cachedStickers = null
    setLoading(true)
    setError(null)

    try {
      const nextStickers = await fetchStickersCatalog()
      cachedStickers = nextStickers
      setStickers(nextStickers)
      setStickerById(Object.fromEntries(nextStickers.map((s) => [s.id, s.url])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stickers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (cachedStickers) return

    let cancelled = false

    loadStickers()
      .then((nextStickers) => {
        if (cancelled) return
        setStickers(nextStickers)
        setStickerById(Object.fromEntries(nextStickers.map((s) => [s.id, s.url])))
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load stickers')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { stickers, stickerById, loading, error, reload }
}
