import {
  Avatar,
  Box,
  Button,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import PaginatedListCard from '@/components/common/PaginatedListCard'
import { usePagination } from '@/hooks/usePagination'
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

  const {
    paginatedItems: paginatedRequests,
    page: requestsPage,
    setPage: setRequestsPage,
    totalPages: requestsTotalPages,
    pageSize: requestsPageSize,
  } = usePagination(requests, undefined, requests.length)

  const {
    paginatedItems: paginatedFriends,
    page: friendsPage,
    setPage: setFriendsPage,
    totalPages: friendsTotalPages,
    pageSize: friendsPageSize,
  } = usePagination(friends, undefined, friends.length)

  function handleAccept(request: FriendRequest) {
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
    setFriends((prev) => [
      ...prev,
      {
        id: request.from.id,
        fullName: request.from.fullName,
        avatarUrl: request.from.avatarUrl,
        createdAt: new Date().toISOString(),
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

      <PaginatedListCard
        itemCount={requests.length}
        paginatedItems={paginatedRequests}
        page={requestsPage}
        totalPages={requestsTotalPages}
        onPageChange={setRequestsPage}
        pageSize={requestsPageSize}
        emptyMessage="No pending requests."
        getItemKey={(request) => request.id}
        sx={{ mb: 4 }}
        renderItem={(request, index, pageSize) => (
          <ListItem
            divider={index < pageSize - 1}
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
              secondary={`Sent ${formatDate(request.sentAt)}`}
            />
          </ListItem>
        )}
      />

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Your Friends
        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          ({friends.length})
        </Typography>
      </Typography>

      <PaginatedListCard
        itemCount={friends.length}
        paginatedItems={paginatedFriends}
        page={friendsPage}
        totalPages={friendsTotalPages}
        onPageChange={setFriendsPage}
        pageSize={friendsPageSize}
        emptyMessage="No friends yet."
        getItemKey={(friend) => friend.id}
        renderItem={(friend, index, pageSize) => (
          <ListItem divider={index < pageSize - 1}>
            <ListItemAvatar>
              <Avatar src={friend.avatarUrl ?? undefined} alt={friend.fullName} />
            </ListItemAvatar>
            <ListItemText
              primary={friend.fullName}
              secondary={`Friends since ${formatDate(friend.createdAt)}`}
            />
          </ListItem>
        )}
      />
    </Box>
  )
}
