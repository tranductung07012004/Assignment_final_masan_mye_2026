import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import PaginatedListCard from '@/components/common/PaginatedListCard'
import {
  FRIEND_LIST_PAGE_SIZE,
  FRIEND_REQUEST_PAGE_SIZE,
  acceptFriendRequest,
  declineFriendRequest,
  listFriendRequests,
  listFriends,
} from '@/api/friends'
import type { Friend, FriendRequest } from '@/types/friend'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function FriendsPage() {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [requestsPage, setRequestsPage] = useState(0)
  const [requestsTotalPages, setRequestsTotalPages] = useState(1)
  const [requestsTotalElements, setRequestsTotalElements] = useState(0)
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState<string | null>(null)

  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsPage, setFriendsPage] = useState(0)
  const [friendsTotalPages, setFriendsTotalPages] = useState(1)
  const [friendsTotalElements, setFriendsTotalElements] = useState(0)
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsError, setFriendsError] = useState<string | null>(null)

  const [actionError, setActionError] = useState<string | null>(null)

  const fetchRequests = useCallback(async (page: number) => {
    setRequestsLoading(true)
    setRequestsError(null)
    try {
      const result = await listFriendRequests({ page, size: FRIEND_REQUEST_PAGE_SIZE })
      setRequests(result.requests)
      setRequestsPage(result.page)
      setRequestsTotalPages(result.totalPages)
      setRequestsTotalElements(result.totalElements)
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : 'Failed to load friend requests')
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  const fetchFriends = useCallback(async (page: number) => {
    setFriendsLoading(true)
    setFriendsError(null)
    try {
      const result = await listFriends({ page, size: FRIEND_LIST_PAGE_SIZE })
      setFriends(result.friends)
      setFriendsPage(result.page)
      setFriendsTotalPages(result.totalPages)
      setFriendsTotalElements(result.totalElements)
    } catch (err) {
      setFriendsError(err instanceof Error ? err.message : 'Failed to load friends')
    } finally {
      setFriendsLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests(requestsPage) }, [requestsPage, fetchRequests])
  useEffect(() => { fetchFriends(friendsPage) }, [friendsPage, fetchFriends])

  async function handleAccept(request: FriendRequest) {
    setActionError(null)
    try {
      await acceptFriendRequest(request.id)
      await fetchRequests(requestsPage)
      await fetchFriends(0)
      setFriendsPage(0)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to accept request')
    }
  }

  async function handleDecline(requestId: number) {
    setActionError(null)
    try {
      await declineFriendRequest(requestId)
      await fetchRequests(requestsPage)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to decline request')
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Friends
      </Typography>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Friend Requests
        {requestsTotalElements > 0 && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({requestsTotalElements})
          </Typography>
        )}
      </Typography>

      {requestsError ? (
        <Alert
          severity="error"
          sx={{ mb: 4 }}
          action={
            <Button color="inherit" size="small" onClick={() => fetchRequests(requestsPage)}>
              Retry
            </Button>
          }
        >
          {requestsError}
        </Alert>
      ) : requestsLoading && requests.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, mb: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <PaginatedListCard
          itemCount={requestsTotalElements}
          paginatedItems={requests}
          page={requestsPage}
          totalPages={requestsTotalPages}
          onPageChange={setRequestsPage}
          pageSize={FRIEND_REQUEST_PAGE_SIZE}
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
      )}

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Your Friends
        {friendsTotalElements > 0 && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            ({friendsTotalElements})
          </Typography>
        )}
      </Typography>

      {friendsError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => fetchFriends(friendsPage)}>
              Retry
            </Button>
          }
        >
          {friendsError}
        </Alert>
      ) : friendsLoading && friends.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <PaginatedListCard
          itemCount={friendsTotalElements}
          paginatedItems={friends}
          page={friendsPage}
          totalPages={friendsTotalPages}
          onPageChange={setFriendsPage}
          pageSize={FRIEND_LIST_PAGE_SIZE}
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
      )}
    </Box>
  )
}
