import {
  Avatar,
  Box,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { mockFriendRequests, mockFriends } from '@/mock/friends'
import type { Friend, FriendRequest } from '@/types/friend'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function FriendsPage() {
  const [requests, setRequests] = useState<FriendRequest[]>(mockFriendRequests)
  const [friends, setFriends] = useState<Friend[]>(mockFriends)

  function handleAccept(request: FriendRequest) {
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
    setFriends((prev) => [
      ...prev,
      {
        id: request.from.id,
        fullName: request.from.fullName,
        email: request.from.email,
        avatarUrl: request.from.avatarUrl,
        friendsSince: new Date().toISOString(),
      },
    ])
  }

  function handleDecline(requestId: number) {
    setRequests((prev) => prev.filter((r) => r.id !== requestId))
  }

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Friends
      </Typography>

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Friend Requests
        {requests.length > 0 && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({requests.length})
          </Typography>
        )}
      </Typography>

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', mb: 4 }}>
        <List disablePadding>
          {requests.length === 0 ? (
            <ListItem sx={{ py: 3, justifyContent: 'center' }}>
              <Typography color="text.secondary">No pending requests.</Typography>
            </ListItem>
          ) : (
            requests.map((request, index) => (
              <ListItem
                key={request.id}
                divider={index < requests.length - 1}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleAccept(request)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="inherit"
                      onClick={() => handleDecline(request.id)}
                    >
                      Decline
                    </Button>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar
                    src={request.from.avatarUrl ?? undefined}
                    alt={request.from.fullName}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={request.from.fullName}
                  secondary={`${request.from.email} · Sent ${formatDate(request.sentAt)}`}
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Your Friends
        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          ({friends.length})
        </Typography>
      </Typography>

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <List disablePadding>
          {friends.map((friend, index) => (
            <ListItem
              key={friend.id}
              divider={index < friends.length - 1}
            >
              <ListItemAvatar>
                <Avatar src={friend.avatarUrl ?? undefined} alt={friend.fullName} />
              </ListItemAvatar>
              <ListItemText
                primary={friend.fullName}
                secondary={`${friend.email} · Friends since ${formatDate(friend.friendsSince)}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  )
}
