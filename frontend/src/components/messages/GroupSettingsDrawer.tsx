import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import {
  Alert,
  Avatar,
  Badge,
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
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { fetchGroupInfo, kickGroupMember, leaveGroupApi } from '@/api/groups'
import AddGroupMemberPanel from '@/components/messages/AddGroupMemberPanel'
import LeaveGroupDialog from '@/components/messages/LeaveGroupDialog'
import { useChatStore } from '@/stores/chatStore'
import { MAX_GROUP_MEMBERS, type GroupMember } from '@/types/chat'
import { toast } from '@/utils/toast'

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
  const setMembers = useChatStore((state) => state.setMembers)
  const leaveGroup = useChatStore((state) => state.leaveGroup)
  const presenceById = useChatStore((state) => state.presenceById)

  const [addPanelOpen, setAddPanelOpen] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const isOwner = members.some((m) => m.isSelf && m.role === 'OWNER')
  const memberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members])

  const isFull = members.length >= MAX_GROUP_MEMBERS
  const canAdd = isOwner && !isFull
  const slotsRemaining = MAX_GROUP_MEMBERS - members.length

  useEffect(() => {
    if (!open) setAddPanelOpen(false)
  }, [open])

  async function refreshMembers() {
    const info = await fetchGroupInfo(groupId)
    setMembers(groupId, info.members.map((m) => ({
      userId: m.userId,
      fullName: m.fullName,
      avatarUrl: m.avatarUrl,
      role: m.memberRole as 'OWNER' | 'MEMBER',
      isSelf: members.find((cur) => cur.userId === m.userId)?.isSelf ?? false,
    })))
  }

  async function handleRemoveMember(memberId: number) {
    setActionLoading(true)
    try {
      await kickGroupMember(groupId, memberId)
      await refreshMembers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleLeaveConfirm() {
    setLeaveDialogOpen(false)
    try {
      await leaveGroupApi(groupId)
      leaveGroup(groupId)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to leave group')
    }
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
                  disabled={actionLoading}
                  onClick={() => setAddPanelOpen(true)}
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
                        disabled={actionLoading}
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        Remove
                      </Button>
                    ) : undefined
                  }
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      sx={{
                        '& .MuiBadge-badge': {
                          bgcolor: presenceById[member.userId] ? 'success.main' : 'grey.400',
                          boxShadow: '0 0 0 2px white',
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                        },
                      }}
                    >
                      <Avatar src={member.avatarUrl ?? undefined} alt={member.fullName} />
                    </Badge>
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

      <AddGroupMemberPanel
        open={addPanelOpen}
        groupId={groupId}
        groupTitle={groupTitle}
        memberIds={memberIds}
        slotsRemaining={slotsRemaining}
        onClose={() => setAddPanelOpen(false)}
        onMemberAdded={refreshMembers}
      />

      <LeaveGroupDialog
        open={leaveDialogOpen}
        groupTitle={groupTitle}
        onClose={() => setLeaveDialogOpen(false)}
        onConfirm={handleLeaveConfirm}
      />
    </>
  )
}
