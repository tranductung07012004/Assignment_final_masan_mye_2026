import { Box, Fade, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import LoginForm from '@/components/LoginForm'
import RegisterForm from '@/components/RegisterForm'
import AuthLayout from '@/layouts/AuthLayout'

type AuthView = 'login' | 'register'

export default function AuthPage() {
  const [authView, setAuthView] = useState<AuthView>('login')

  return (
    <AuthLayout>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Tabs
          value={authView}
          onChange={(_e, value: AuthView) => setAuthView(value)}
          variant="fullWidth"
          sx={{
            mb: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            minHeight: 42,
            '& .MuiTab-root': {
              minHeight: 42,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            },
          }}
        >
          <Tab label="Login" value="login" />
          <Tab label="Sign up" value="register" />
        </Tabs>

        <Fade in key={authView} timeout={200}>
          <Box>
            {authView === 'login' ? (
              <LoginForm />
            ) : (
              <RegisterForm onNavigateToLogin={() => setAuthView('login')} />
            )}
          </Box>
        </Fade>
      </Box>
    </AuthLayout>
  )
}
