import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { createGroup } from '@/api/groups'
import { FRIEND_LIST_PAGE_SIZE, listFriends } from '@/api/friends'
import ListPagination from '@/components/common/ListPagination'
import {
  MAX_FRIENDS_TO_SELECT,
  MIN_FRIENDS_TO_SELECT,
  MIN_GROUP_MEMBERS,
  MAX_GROUP_MEMBERS,
  type ChatListItem,
} from '@/types/chat'
import type { Friend } from '@/types/friend'

type CreateGroupDialogProps = {
  open: boolean
  onClose: () => void
  onCreated: (chat: ChatListItem) => void
}

export default function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: CreateGroupDialogProps) {
  const [title, setTitle] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [friendSearchInput, setFriendSearchInput] = useState('')
  const [appliedFriendKeyword, setAppliedFriendKeyword] = useState('')
  const [friendPage, setFriendPage] = useState(0)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendTotalPages, setFriendTotalPages] = useState(1)
  const [friendTotalElements, setFriendTotalElements] = useState(0)
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsError, setFriendsError] = useState<string | null>(null)

  const fetchIdRef = useRef(0)

  const fetchFriends = useCallback(async (keyword: string, pageNum: number) => {
    const fetchId = ++fetchIdRef.current
    setFriendsLoading(true)
    setFriendsError(null)

    try {
      const result = await listFriends({
        keyword,
        page: pageNum,
        size: FRIEND_LIST_PAGE_SIZE,
      })

      if (fetchId !== fetchIdRef.current) return

      setFriends(result.friends)
      setFriendTotalPages(result.totalPages)
      setFriendTotalElements(result.totalElements)
      setFriendPage(result.page)
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      setFriendsError(err instanceof Error ? err.message : 'Failed to load friends')
    } finally {
      if (fetchId === fetchIdRef.current) {
        setFriendsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return
    fetchFriends(appliedFriendKeyword, friendPage)
  }, [open, appliedFriendKeyword, friendPage, fetchFriends])

  function resetForm() {
    setTitle('')
    setAvatarUrl('')
    setSelectedFriendIds([])
    setError(null)
    setSubmitting(false)
    setFriendSearchInput('')
    setAppliedFriendKeyword('')
    setFriendPage(0)
    setFriends([])
    setFriendTotalPages(1)
    setFriendTotalElements(0)
    setFriendsError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function applyFriendSearch() {
    const keyword = friendSearchInput.trim()
    if (keyword === appliedFriendKeyword && friendPage === 0) {
      fetchFriends(keyword, 0)
      return
    }
    setAppliedFriendKeyword(keyword)
    if (friendPage !== 0) {
      setFriendPage(0)
    }
  }

  function toggleFriend(friendId: number) {
    setSelectedFriendIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId)
      }
      if (prev.length >= MAX_FRIENDS_TO_SELECT) return prev
      return [...prev, friendId]
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Group name is required.')
      return
    }

    if (selectedFriendIds.length < MIN_FRIENDS_TO_SELECT) {
      setError(`Select at least ${MIN_FRIENDS_TO_SELECT} friends (${MIN_GROUP_MEMBERS} members including you).`)
      return
    }

    setSubmitting(true)
    try {
      const group = await createGroup({
        title: title.trim(),
        avatarUrl: avatarUrl.trim() || null,
        memberIds: selectedFriendIds,
      })

      onCreated({
        groupId: group.groupId,
        type: 'GROUP',
        title: group.title,
        avatarUrl: group.avatarUrl,
      })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Group Chat</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Groups must have at least {MIN_GROUP_MEMBERS} and at most {MAX_GROUP_MEMBERS}{' '}
            members including you.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Group name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            sx={{ mb: 2 }}
          />

          <TextField
            label="Avatar URL"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            fullWidth
            placeholder="https://..."
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Add friends ({selectedFriendIds.length}/{MAX_FRIENDS_TO_SELECT})
          </Typography>

          <TextField
            fullWidth
            size="small"
            placeholder="Search friends by name... (Enter)"
            value={friendSearchInput}
            onChange={(e) => setFriendSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyFriendSearch()
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton
                      size="small"
                      edge="start"
                      aria-label="Search friends"
                      onClick={applyFriendSearch}
                    >
                      <SearchIcon fontSize="small" color="action" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 1.5 }}
          />

          {friendsError ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button
                  size="small"
                  onClick={() => fetchFriends(appliedFriendKeyword, friendPage)}
                >
                  Retry
                </Button>
              }
            >
              {friendsError}
            </Alert>
          ) : friendsLoading && friends.length === 0 ? (
            <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : friends.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No friends found.
            </Typography>
          ) : (
            <FormGroup>
              {friends.map((friend) => (
                <FormControlLabel
                  key={friend.id}
                  control={
                    <Checkbox
                      checked={selectedFriendIds.includes(friend.id)}
                      onChange={() => toggleFriend(friend.id)}
                      disabled={
                        !selectedFriendIds.includes(friend.id) &&
                        selectedFriendIds.length >= MAX_FRIENDS_TO_SELECT
                      }
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={friend.avatarUrl ?? undefined}
                        alt={friend.fullName}
                        sx={{ width: 28, height: 28 }}
                      />
                      <Typography variant="body2">{friend.fullName}</Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          )}

          <Box sx={{ mt: 1 }}>
            <ListPagination
              page={friendPage}
              totalPages={friendTotalPages}
              onPageChange={setFriendPage}
              itemCount={friendTotalElements}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
