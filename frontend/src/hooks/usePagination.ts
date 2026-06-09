import { useEffect, useMemo, useState } from 'react'
import { getTotalPages, PAGE_SIZE, paginateItems } from '@/utils/pagination'

export function usePagination<T>(
  items: T[],
  pageSize = PAGE_SIZE,
  resetKey?: string | number,
) {
  const [page, setPage] = useState(0)

  const totalPages = getTotalPages(items.length, pageSize)
  const safePage = Math.min(page, totalPages - 1)

  const paginatedItems = useMemo(
    () => paginateItems(items, safePage, pageSize),
    [items, safePage, pageSize],
  )

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])

  useEffect(() => {
    setPage(0)
  }, [resetKey, pageSize])

  return {
    paginatedItems,
    page: safePage,
    setPage,
    totalPages,
    pageSize,
  }
}
