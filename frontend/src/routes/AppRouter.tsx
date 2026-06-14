import { Box, CircularProgress } from '@mui/material'
import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import AuthPage from '@/pages/AuthPage'
import FriendsPage from '@/pages/FriendsPage'
import MessagesPage from '@/pages/MessagesPage'
import ProfilePage from '@/pages/ProfilePage'
import SearchPage from '@/pages/SearchPage'
import ProtectedRoute from '@/routes/ProtectedRoute'
import { useAuthStore } from '@/stores/authStore'

function AuthRedirect() {
  const accessToken = useAuthStore((state) => state.accessToken)

  if (accessToken) {
    return <Navigate to="/search" replace />
  }

  return <AuthPage />
}

export default function AppRouter() {
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping)
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession)

  useEffect(() => {
    bootstrapSession()
  }, [bootstrapSession])

  if (isBootstrapping) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<AuthRedirect />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
