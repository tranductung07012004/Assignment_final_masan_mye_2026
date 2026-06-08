import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import AuthCard from '@/components/AuthCard'
import { useAuthStore } from '@/stores/authStore'

type LoginFormProps = {
  onNavigateToRegister: () => void
}

export default function LoginForm({ onNavigateToRegister }: LoginFormProps) {
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
      title="Login"
      subtitle="Enter your email and password to continue"
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
          />

          <TextField
            label="Password"
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            slotProps={{ htmlInput: { minLength: 3 } }}
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
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center' }}
          >
            Don&apos;t have an account?{' '}
            <Button
              variant="text"
              size="small"
              onClick={onNavigateToRegister}
              sx={{ textTransform: 'none', fontWeight: 600, p: 0, minWidth: 0 }}
            >
              Sign up
            </Button>
          </Typography>
        </Stack>
      </Box>
    </AuthCard>
  )
}
