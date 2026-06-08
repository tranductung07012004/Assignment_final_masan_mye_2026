import {
  AppBar,
  Avatar,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'

const NAV_TABS = [
  { label: 'Messages', path: '/messages' },
  { label: 'Search People', path: '/search' },
  { label: 'Friends', path: '/friends' },
] as const

function getTabIndex(pathname: string): number | false {
  const index = NAV_TABS.findIndex((tab) => pathname.startsWith(tab.path))
  return index === -1 ? false : index
}

export default function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const clearProfile = useProfileStore((state) => state.clearProfile)
  const profile = useProfileStore((state) => state.profile)
  const isProfileLoading = useProfileStore((state) => state.isLoading)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const tabIndex = getTabIndex(location.pathname)
  const isProfilePage = location.pathname.startsWith('/profile')

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      clearProfile()
      navigate('/')
    } finally {
      setIsLoggingOut(false)
      setAnchorEl(null)
    }
  }

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <Typography
          variant="h6"
          component={Link}
          to="/messages"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            textDecoration: 'none',
            mr: 2,
          }}
        >
          ChatApp
        </Typography>

        <Tabs
          value={isProfilePage ? false : tabIndex}
          sx={{ flex: 1 }}
        >
          {NAV_TABS.map((tab) => (
            <Tab
              key={tab.path}
              label={tab.label}
              component={Link}
              to={tab.path}
            />
          ))}
        </Tabs>

        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
          {isProfileLoading ? (
            <CircularProgress size={36} />
          ) : (
            <Avatar
              src={profile?.avatarUrl ?? undefined}
              alt={profile?.fullName ?? 'User'}
              sx={{ width: 36, height: 36 }}
            >
              {profile?.fullName?.charAt(0) ?? 'U'}
            </Avatar>
          )}
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              setAnchorEl(null)
              navigate('/profile')
            }}
          >
            View Profile
          </MenuItem>
          <MenuItem onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
