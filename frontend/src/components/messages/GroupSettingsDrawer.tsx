import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { mockFriends } from '@/mock/friends'
import { useChatStore } from '@/stores/chatStore'
import { MAX_GROUP_MEMBERS, type GroupMember } from '@/types/chat'
import LeaveGroupDialog from '@/components/messages/LeaveGroupDialog'

const EMPTY_MEMBERS: GroupMember[] = []

type GroupSettingsDrawerProps = {
  open: boolean
  groupId: number
  groupTitle: string
  onClose: () => void
}

export default function GroupSettingsDrawer({
  open,
  groupId,
  groupTitle,
  onClose,
}: GroupSettingsDrawerProps) {
  const members =
    useChatStore((state) => state.membersByGroupId[groupId]) ?? EMPTY_MEMBERS
  const addMemberToGroup = useChatStore((state) => state.addMemberToGroup)
  const removeMemberFromGroup = useChatStore((state) => state.removeMemberFromGroup)
  const leaveGroup = useChatStore((state) => state.leaveGroup)

  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)

  const isOwner = members.some((m) => m.isSelf && m.role === 'OWNER')
  const memberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members])
  const addableFriends = useMemo(
    () => mockFriends.filter((f) => !memberIds.has(f.id)),
    [memberIds],
  )

  const isFull = members.length >= MAX_GROUP_MEMBERS
  const canAdd = isOwner && !isFull && addableFriends.length > 0

  function handleLeaveConfirm() {
    leaveGroup(groupId)
    setLeaveDialogOpen(false)
    onClose()
  }

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box sx={{ width: 360, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Group settings
            </Typography>
            <IconButton onClick={onClose} aria-label="Close">
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ px: 2, py: 2, flex: 1, overflow: 'auto' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              {groupTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {members.length}/{MAX_GROUP_MEMBERS} members
            </Typography>

            {!isOwner && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Only the group owner can add or remove members.
              </Alert>
            )}

            {isOwner && isFull && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This group has reached the maximum of {MAX_GROUP_MEMBERS} members.
              </Alert>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">Members</Typography>
              {canAdd && (
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                >
                  Add
                </Button>
              )}
            </Box>

            <List disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {members.map((member, index) => (
                <ListItem
                  key={member.userId}
                  divider={index < members.length - 1}
                  secondaryAction={
                    isOwner && !member.isSelf ? (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => removeMemberFromGroup(groupId, member.userId)}
                      >
                        Remove
                      </Button>
                    ) : undefined
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={member.avatarUrl ?? undefined} alt={member.fullName} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {member.fullName}
                        {member.isSelf && (
                          <Chip label="You" size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={member.role === 'OWNER' ? 'Owner' : 'Member'}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider />
          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={() => setLeaveDialogOpen(true)}
            >
              Leave group
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={() => setAddMenuAnchor(null)}
      >
        {addableFriends.map((friend) => (
          <MenuItem
            key={friend.id}
            onClick={() => {
              addMemberToGroup(groupId, friend.id)
              setAddMenuAnchor(null)
            }}
          >
            <Avatar
              src={friend.avatarUrl ?? undefined}
              alt={friend.fullName}
              sx={{ width: 28, height: 28, mr: 1.5 }}
            />
            {friend.fullName}
          </MenuItem>
        ))}
      </Menu>

      <LeaveGroupDialog
        open={leaveDialogOpen}
        groupTitle={groupTitle}
        onClose={() => setLeaveDialogOpen(false)}
        onConfirm={handleLeaveConfirm}
      />
    </>
  )
}
