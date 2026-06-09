import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import ChatAppLogo from '@/components/common/ChatAppLogo'
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import AuthCard from '@/components/AuthCard'
import { useAuthStore } from '@/stores/authStore'

export default function LoginForm() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((state) => state.setAccessToken)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const accessToken = await login({ email, password })
      setAccessToken(accessToken)
      navigate('/search')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue chatting with your friends."
      icon={<ChatAppLogo />}
      iconVariant="logo"
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            label="Password"
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            slotProps={{
              htmlInput: { minLength: 3 },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
            required
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isSubmitting}
            sx={{ mt: 0.5 }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </Stack>
      </Box>
    </AuthCard>
  )
}
