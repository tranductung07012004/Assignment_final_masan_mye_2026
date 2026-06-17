import SearchIcon from '@mui/icons-material/Search'
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FRIEND_LIST_PAGE_SIZE, listFriends } from '@/api/friends'
import { addGroupMember } from '@/api/groups'
import ListPagination from '@/components/common/ListPagination'
import type { Friend } from '@/types/friend'
import { toast } from '@/utils/toast'

type AddGroupMemberPanelProps = {
  open: boolean
  groupId: number
  groupTitle: string
  memberIds: Set<number>
  slotsRemaining: number
  onClose: () => void
  onMemberAdded: () => Promise<void>
}

export default function AddGroupMemberPanel({
  open,
  groupId,
  groupTitle,
  memberIds,
  slotsRemaining,
  onClose,
  onMemberAdded,
}: AddGroupMemberPanelProps) {
  const [friendSearchInput, setFriendSearchInput] = useState('')
  const [appliedFriendKeyword, setAppliedFriendKeyword] = useState('')
  const [friendPage, setFriendPage] = useState(0)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendTotalPages, setFriendTotalPages] = useState(1)
  const [friendTotalElements, setFriendTotalElements] = useState(0)
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsError, setFriendsError] = useState<string | null>(null)

  const [pendingFriend, setPendingFriend] = useState<Friend | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

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

  function resetState() {
    setFriendSearchInput('')
    setAppliedFriendKeyword('')
    setFriendPage(0)
    setFriends([])
    setFriendTotalPages(1)
    setFriendTotalElements(0)
    setFriendsError(null)
    setPendingFriend(null)
    setConfirmOpen(false)
    setConfirmLoading(false)
  }

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }
    fetchFriends(appliedFriendKeyword, friendPage)
  }, [open, appliedFriendKeyword, friendPage, fetchFriends])

  function handleClose() {
    resetState()
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

  function handleFriendClick(friend: Friend) {
    if (memberIds.has(friend.id)) return
    setPendingFriend(friend)
    setConfirmOpen(true)
  }

  function handleConfirmCancel() {
    setConfirmOpen(false)
    setPendingFriend(null)
  }

  async function handleConfirmAdd() {
    if (!pendingFriend) return

    setConfirmLoading(true)
    try {
      await addGroupMember(groupId, pendingFriend.id)
      await onMemberAdded()
      handleConfirmCancel()

      if (slotsRemaining <= 1) {
        handleClose()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add members to &quot;{groupTitle}&quot;</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {slotsRemaining} slot{slotsRemaining === 1 ? '' : 's'} remaining
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
            <List disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {friends.map((friend, index) => {
                const alreadyInGroup = memberIds.has(friend.id)
                return (
                  <ListItemButton
                    key={friend.id}
                    divider={index < friends.length - 1}
                    onClick={() => handleFriendClick(friend)}
                    disabled={confirmLoading || alreadyInGroup}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={friend.avatarUrl ?? undefined}
                        alt={friend.fullName}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={friend.fullName}
                      secondary={alreadyInGroup ? 'Already in group' : undefined}
                    />
                  </ListItemButton>
                )
              })}
            </List>
          )}

          <Box sx={{ mt: 1 }}>
            <ListPagination
              page={friendPage}
              totalPages={friendTotalPages}
              onPageChange={setFriendPage}
              itemCount={friendTotalElements}
              pageSize={FRIEND_LIST_PAGE_SIZE}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={confirmLoading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={confirmLoading ? undefined : handleConfirmCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add member?</DialogTitle>
        <DialogContent>
          {pendingFriend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Avatar
                src={pendingFriend.avatarUrl ?? undefined}
                alt={pendingFriend.fullName}
              />
              <Typography variant="body1">{pendingFriend.fullName}</Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            Add {pendingFriend?.fullName ?? 'this friend'} to &quot;{groupTitle}&quot;?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleConfirmCancel} disabled={confirmLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmAdd}
            disabled={confirmLoading}
          >
            {confirmLoading ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
