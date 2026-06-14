import { Box, Typography } from '@mui/material'

export default function ChatEmptyState() {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography color="text.secondary">
        Select a conversation to start chatting.
      </Typography>
    </Box>
  )
}
