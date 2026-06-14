import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sendFriendRequest } from '@/api/friends'
import { searchUsers, USER_SEARCH_PAGE_SIZE } from '@/api/users'
import PaginatedListCard from '@/components/common/PaginatedListCard'
import { useProfileStore } from '@/stores/profileStore'
import type { SearchUser } from '@/types/friend'

function canSendFriendRequest(
  user: SearchUser,
  currentUserId: number | null,
): boolean {
  if (!currentUserId) return false
  if (!user.friendRequestStatus) return true
  if (user.friendRequestStatus === 'PENDING') return false
  if (user.friendRequestStatus === 'ACCEPTED') return false
  if (user.friendRequestStatus === 'REJECTED') {
    const isOriginalSender = user.friendRequestSenderId === currentUserId
    if (!isOriginalSender) return true
    if (!user.cooldownAt) return true
    return new Date(user.cooldownAt) <= new Date()
  }
  return false
}

function getStatusChip(
  user: SearchUser,
  currentUserId: number | null,
): { label: string; color?: 'default' | 'primary' | 'success' } | null {
  if (!user.friendRequestStatus) return null

  if (user.friendRequestStatus === 'PENDING') {
    if (user.friendRequestSenderId === currentUserId) {
      return { label: 'Request sent', color: 'default' }
    }
    return { label: 'Incoming request', color: 'primary' }
  }

  if (user.friendRequestStatus === 'ACCEPTED') {
    return { label: 'Friends', color: 'success' }
  }

  if (user.friendRequestStatus === 'REJECTED') {
    const isOriginalSender = user.friendRequestSenderId === currentUserId
    if (isOriginalSender && user.cooldownAt && new Date(user.cooldownAt) > new Date()) {
      return { label: 'Cooldown active', color: 'default' }
    }
  }

  return null
}

export default function SearchPage() {
  const currentUserId = useProfileStore((state) => state.profile?.id ?? null)

  const [searchInput, setSearchInput] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [users, setUsers] = useState<SearchUser[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sendingUserId, setSendingUserId] = useState<number | null>(null)

  const fetchIdRef = useRef(0)

  const fetchUsers = useCallback(async (keyword: string, pageNum: number) => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)

    try {
      const result = await searchUsers({
        keyword,
        page: pageNum,
        size: USER_SEARCH_PAGE_SIZE,
      })

      if (fetchId !== fetchIdRef.current) return

      setUsers(result.users)
      setTotalPages(result.totalPages)
      setTotalElements(result.totalElements)
      setPage(result.page)
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchUsers(appliedKeyword, page)
  }, [appliedKeyword, page, fetchUsers])

  function applySearch() {
    const keyword = searchInput.trim()
    if (keyword === appliedKeyword && page === 0) {
      fetchUsers(keyword, 0)
      return
    }
    setAppliedKeyword(keyword)
    if (page !== 0) {
      setPage(0)
    }
  }

  async function handleAddFriend(user: SearchUser) {
    setActionError(null)
    setSendingUserId(user.id)

    try {
      await sendFriendRequest({ receiverId: user.id })
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? {
                ...item,
                friendRequestStatus: 'PENDING',
                friendRequestSenderId: currentUserId,
                cooldownAt: null,
              }
            : item,
        ),
      )
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send friend request')
    } finally {
      setSendingUserId(null)
    }
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
        placeholder="Search by name... (Enter)"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            applySearch()
          }
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button size="small" onClick={applySearch}>
                  Search
                </Button>
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 3 }}
      />

      {actionError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      {error ? (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => fetchUsers(appliedKeyword, page)}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {loading && users.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <>
          <PaginatedListCard
            itemCount={totalElements}
            paginatedItems={users}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={USER_SEARCH_PAGE_SIZE}
            emptyMessage="No users found."
            getItemKey={(user) => user.id}
            renderItem={(user, index, pageSize) => {
              const statusChip = getStatusChip(user, currentUserId)
              const showAddButton = canSendFriendRequest(user, currentUserId)
              const isSending = sendingUserId === user.id

              return (
                <ListItem
                  divider={index < pageSize - 1}
                  secondaryAction={
                    statusChip ? (
                      <Chip label={statusChip.label} size="small" color={statusChip.color} />
                    ) : showAddButton ? (
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={isSending}
                        onClick={() => handleAddFriend(user)}
                      >
                        {isSending ? 'Sending...' : 'Add Friend'}
                      </Button>
                    ) : null
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={user.avatarUrl ?? undefined} alt={user.fullName} />
                  </ListItemAvatar>
                  <ListItemText primary={user.fullName} />
                </ListItem>
              )
            }}
          />
        </>
      )}
    </Box>
  )
}
