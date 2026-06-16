import { Box } from '@mui/material'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import AppFooter from '@/components/layout/AppFooter'
import AppHeader from '@/components/layout/AppHeader'
import { useProfileStore } from '@/stores/profileStore'

export default function MainLayout() {
  const fetchProfile = useProfileStore((state) => state.fetchProfile)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <AppHeader />
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
      <AppFooter />
    </Box>
  )
}
