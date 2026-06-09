import { Box, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type AuthCardProps = {
  title: string
  subtitle: string
  icon?: ReactNode
  iconColor?: 'primary' | 'success'
  iconVariant?: 'default' | 'logo'
  children: ReactNode
}

export default function AuthCard({
  title,
  subtitle,
  icon,
  iconColor = 'primary',
  iconVariant = 'default',
  children,
}: AuthCardProps) {
  const isLogo = iconVariant === 'logo'
  const iconBg = isLogo
    ? 'background.paper'
    : iconColor === 'success'
      ? 'success.light'
      : 'primary.light'
  const iconFg = iconColor === 'success' ? 'success.main' : 'primary.main'

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: 440,
        p: 4,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={3}>
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          {icon && (
            <Box
              sx={{
                width: isLogo ? 56 : 48,
                height: isLogo ? 56 : 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: iconBg,
                color: iconFg,
                ...(isLogo && { border: 1, borderColor: 'divider' }),
              }}
            >
              {icon}
            </Box>
          )}
          <Stack spacing={0.5}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
        </Stack>
        {children}
      </Stack>
    </Paper>
  )
}
