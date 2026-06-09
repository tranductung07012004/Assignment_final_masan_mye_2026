import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  TextField,
  Typography,
} from '@mui/material'
import { type FormEvent, useState } from 'react'
import { mockFriends } from '@/mock/friends'
import { useChatStore } from '@/stores/chatStore'
import { MAX_GROUP_MEMBERS } from '@/types/chat'

type CreateGroupDialogProps = {
  open: boolean
  onClose: () => void
}

const MAX_FRIENDS_TO_SELECT = MAX_GROUP_MEMBERS - 1

export default function CreateGroupDialog({ open, onClose }: CreateGroupDialogProps) {
  const createGroup = useChatStore((state) => state.createGroup)

  const [title, setTitle] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setTitle('')
    setAvatarUrl('')
    setSelectedFriendIds([])
    setError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Group name is required.')
      return
    }

    if (selectedFriendIds.length < 1) {
      setError('Select at least one friend to create a group.')
      return
    }

    createGroup({
      title: title.trim(),
      avatarUrl: avatarUrl.trim() || null,
      friendIds: selectedFriendIds,
    })

    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Group Chat</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Groups can have up to {MAX_GROUP_MEMBERS} members including you.
            Select at least one friend.
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

          <FormGroup>
            {mockFriends.map((friend) => (
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
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Create
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
