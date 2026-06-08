import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { type FormEvent, useState } from 'react'
import { register } from '@/api/auth'
import AuthCard from '@/components/AuthCard'

type RegisterFormProps = {
  onNavigateToLogin: () => void
}

export default function RegisterForm({ onNavigateToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await register({ email, fullName, password })
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthCard
        title="Registration successful"
        subtitle="Your account has been created. You can log in now."
      >
        <Stack spacing={2}>
          <Alert severity="success">
            Congratulations! Log in to start using the app.
          </Alert>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={onNavigateToLogin}
          >
            Go to login
          </Button>
        </Stack>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Sign up"
      subtitle="Create a new account to use the chat app"
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Full name"
            type="text"
            name="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Enter your full name"
            autoComplete="name"
            required
            fullWidth
          />

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
            autoComplete="new-password"
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
            {isSubmitting ? 'Signing up...' : 'Sign up'}
          </Button>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center' }}
          >
            Already have an account?{' '}
            <Button
              variant="text"
              size="small"
              onClick={onNavigateToLogin}
              sx={{ textTransform: 'none', fontWeight: 600, p: 0, minWidth: 0 }}
            >
              Login
            </Button>
          </Typography>
        </Stack>
      </Box>
    </AuthCard>
  )
}
