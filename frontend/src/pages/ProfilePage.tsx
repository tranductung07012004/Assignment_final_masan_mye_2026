import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { type FormEvent, useEffect, useState } from 'react'
import { useProfileStore } from '@/stores/profileStore'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ProfilePage() {
  const profile = useProfileStore((state) => state.profile)
  const isLoading = useProfileStore((state) => state.isLoading)
  const isFromMock = useProfileStore((state) => state.isFromMock)
  const updateProfile = useProfileStore((state) => state.updateProfile)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName)
      setEmail(profile.email)
      setAvatarUrl(profile.avatarUrl ?? '')
    }
  }, [profile])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword && newPassword !== confirmNewPassword) {
      setError('New passwords do not match.')
      return
    }

    setIsSaving(true)
    try {
      await updateProfile({
        fullName,
        email,
        avatarUrl: avatarUrl || null,
        ...(oldPassword ? { oldPassword } : {}),
        ...(newPassword ? { newPassword, confirmNewPassword } : {}),
      })
      setOldPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!profile) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Profile not available.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
        Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your account information.
      </Typography>

      {isFromMock && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing mock profile data. Connect to the backend to load your real profile.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Profile updated successfully.
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 3 }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={avatarUrl || undefined}
              alt={fullName}
              sx={{ width: 72, height: 72 }}
            >
              {fullName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Member since {formatDate(profile.createdAt)}
              </Typography>
            </Box>
          </Box>

          <TextField
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Avatar URL"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            fullWidth
            placeholder="https://..."
          />

          <Divider />

          <Typography variant="subtitle2" color="text.secondary">
            Change password (optional)
          </Typography>

          <TextField
            label="Current password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            fullWidth
            autoComplete="current-password"
          />

          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            autoComplete="new-password"
          />

          <TextField
            label="Confirm new password"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            fullWidth
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            sx={{ alignSelf: 'flex-start' }}
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
