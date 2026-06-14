import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import ChatAppLogo from '@/components/common/ChatAppLogo'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
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
        title="You're all set!"
        subtitle="Your account has been created. Sign in to get started."
        icon={<CheckCircleOutlinedIcon />}
        iconColor="success"
      >
        <Stack spacing={2}>
          <Alert severity="success">
            Welcome to ChatApp! Sign in to start connecting with people.
          </Alert>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={onNavigateToLogin}
          >
            Sign in
          </Button>
        </Stack>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join ChatApp and start connecting with people."
      icon={<ChatAppLogo />}
      iconVariant="logo"
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
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlinedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
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
            autoComplete="new-password"
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
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </Stack>
      </Box>
    </AuthCard>
  )
}
