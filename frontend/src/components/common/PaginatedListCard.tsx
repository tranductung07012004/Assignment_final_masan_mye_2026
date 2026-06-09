import { Avatar, Box, List, ListItem, ListItemAvatar, ListItemText, Paper, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { Fragment, type ReactNode } from 'react'
import ListPagination from '@/components/common/ListPagination'
import { PAGE_SIZE } from '@/utils/pagination'

type PaginatedListCardProps<T> = {
  itemCount: number
  paginatedItems: T[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize?: number
  emptyMessage: string
  getItemKey: (item: T) => string | number
  renderItem: (item: T, index: number, pageSize: number) => ReactNode
  sx?: SxProps<Theme>
}

function PlaceholderRow({ index, pageSize }: { index: number; pageSize: number }) {
  return (
    <ListItem
      divider={index < pageSize - 1}
      sx={{ visibility: 'hidden', pointerEvents: 'none' }}
      aria-hidden
    >
      <ListItemAvatar>
        <Avatar />
      </ListItemAvatar>
      <ListItemText primary="Placeholder" secondary="placeholder@email.com" />
    </ListItem>
  )
}

export default function PaginatedListCard<T>({
  itemCount,
  paginatedItems,
  page,
  totalPages,
  onPageChange,
  pageSize = PAGE_SIZE,
  emptyMessage,
  getItemKey,
  renderItem,
  sx,
}: PaginatedListCardProps<T>) {
  return (
    <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', ...sx }}>
      <Box sx={{ position: 'relative' }}>
        <List disablePadding>
          {Array.from({ length: pageSize }).map((_, index) => {
            const item = itemCount > 0 ? paginatedItems[index] : undefined
            if (item) {
              return (
                <Fragment key={getItemKey(item)}>
                  {renderItem(item, index, pageSize)}
                </Fragment>
              )
            }
            return <PlaceholderRow key={`placeholder-${index}`} index={index} pageSize={pageSize} />
          })}
        </List>

        {itemCount === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography color="text.secondary">{emptyMessage}</Typography>
          </Box>
        )}
      </Box>

      <ListPagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        itemCount={itemCount}
        pageSize={pageSize}
      />
    </Paper>
  )
}
