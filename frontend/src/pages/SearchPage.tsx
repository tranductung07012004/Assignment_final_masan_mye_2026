import {
  Avatar,
  Box,
  Button,
  Chip,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useMemo, useState } from 'react'
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

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <List disablePadding>
          {filteredUsers.length === 0 ? (
            <ListItem sx={{ py: 4, justifyContent: 'center' }}>
              <Typography color="text.secondary">No users found.</Typography>
            </ListItem>
          ) : (
            filteredUsers.map((user, index) => {
              const status = getStatus(user.id)
              return (
                <ListItem
                  key={user.id}
                  divider={index < filteredUsers.length - 1}
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
                  <ListItemText
                    primary={user.fullName}
                    secondary={user.email}
                  />
                </ListItem>
              )
            })
          )}
        </List>
      </Paper>
    </Box>
  )
}
