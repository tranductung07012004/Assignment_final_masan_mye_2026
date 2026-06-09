import {
  Avatar,
  Box,
  Button,
  Chip,
  InputAdornment,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useMemo, useState } from 'react'
import PaginatedListCard from '@/components/common/PaginatedListCard'
import { usePagination } from '@/hooks/usePagination'
import { mockUsers } from '@/mock/users'

type RequestStatus = 'none' | 'pending'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set())

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mockUsers
    return mockUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    )
  }, [query])

  const { paginatedItems, page, setPage, totalPages, pageSize } = usePagination(
    filteredUsers,
    undefined,
    query,
  )

  function handleAddFriend(userId: number) {
    setSentRequests((prev) => new Set(prev).add(userId))
  }

  function getStatus(userId: number): RequestStatus {
    return sentRequests.has(userId) ? 'pending' : 'none'
  }

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
        Search People
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Find users and send friend requests.
      </Typography>

      <TextField
        fullWidth
        placeholder="Search by name or email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 3 }}
      />

      <PaginatedListCard
        itemCount={filteredUsers.length}
        paginatedItems={paginatedItems}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        emptyMessage="No users found."
        getItemKey={(user) => user.id}
        renderItem={(user, index, pageSize) => {
          const status = getStatus(user.id)
          return (
            <ListItem
              divider={index < pageSize - 1}
              secondaryAction={
                status === 'pending' ? (
                  <Chip label="Request sent" size="small" color="default" />
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleAddFriend(user.id)}
                  >
                    Add Friend
                  </Button>
                )
              }
            >
              <ListItemAvatar>
                <Avatar src={user.avatarUrl ?? undefined} alt={user.fullName} />
              </ListItemAvatar>
              <ListItemText primary={user.fullName} secondary={user.email} />
            </ListItem>
          )
        }}
      />
    </Box>
  )
}
