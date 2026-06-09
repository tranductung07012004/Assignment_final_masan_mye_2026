export const PAGE_SIZE = 5

export function getTotalPages(itemCount: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(itemCount / pageSize))
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = PAGE_SIZE,
): T[] {
  return items.slice(page * pageSize, page * pageSize + pageSize)
}
