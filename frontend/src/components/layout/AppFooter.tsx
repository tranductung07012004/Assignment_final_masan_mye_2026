import { Box, Typography } from '@mui/material'

export default function AppFooter() {
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Chat App &mdash; Connect with friends and chat in real time.
      </Typography>
      <Typography variant="caption" color="text.disabled">
        &copy; {new Date().getFullYear()} Chat App. All rights reserved.
      </Typography>
    </Box>
  )
}
