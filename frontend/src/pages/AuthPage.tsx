import { Box } from '@mui/material'
import { useState } from 'react'
import LoginForm from '@/components/LoginForm'
import RegisterForm from '@/components/RegisterForm'

type AuthView = 'login' | 'register'

export default function AuthPage() {
  const [authView, setAuthView] = useState<AuthView>('login')

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      {authView === 'login' ? (
        <LoginForm onNavigateToRegister={() => setAuthView('register')} />
      ) : (
        <RegisterForm onNavigateToLogin={() => setAuthView('login')} />
      )}
    </Box>
  )
}
