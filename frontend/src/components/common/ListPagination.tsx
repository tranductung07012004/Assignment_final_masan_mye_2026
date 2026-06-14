import { Box, Pagination, Typography } from '@mui/material'
import { PAGE_SIZE } from '@/utils/pagination'

type ListPaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  itemCount: number
  pageSize?: number
}

export default function ListPagination({
  page,
  totalPages,
  onPageChange,
  itemCount,
  pageSize = PAGE_SIZE,
}: ListPaginationProps) {
  const showPagination = itemCount > pageSize

  return (
    <Box
      sx={{
        py: 1.5,
        px: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        visibility: showPagination ? 'visible' : 'hidden',
      }}
      aria-hidden={!showPagination}
    >
      <Pagination
        count={totalPages}
        page={page + 1}
        onChange={(_e, nextPage) => onPageChange(nextPage - 1)}
        size="small"
        color="primary"
        siblingCount={0}
        boundaryCount={1}
      />
      <Typography variant="caption" color="text.disabled">
        Page {page + 1} of {totalPages}
      </Typography>
    </Box>
  )
}
