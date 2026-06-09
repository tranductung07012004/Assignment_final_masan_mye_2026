import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

type LeaveGroupDialogProps = {
  open: boolean
  groupTitle: string
  onClose: () => void
  onConfirm: () => void
}

export default function LeaveGroupDialog({
  open,
  groupTitle,
  onClose,
  onConfirm,
}: LeaveGroupDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Leave group?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          You are about to leave <strong>{groupTitle}</strong>. You will no longer
          receive new messages from this group.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Leave group
        </Button>
      </DialogActions>
    </Dialog>
  )
}
