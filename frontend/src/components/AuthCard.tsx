import { Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type AuthCardProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <Paper
      elevation={2}
      sx={{
        width: '100%',
        maxWidth: 400,
        p: 4,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Stack>
        {children}
      </Stack>
    </Paper>
  )
}
