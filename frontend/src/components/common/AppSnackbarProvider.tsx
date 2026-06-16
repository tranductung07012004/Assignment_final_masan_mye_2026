import { SnackbarProvider, useSnackbar } from 'notistack'
import { useEffect, type ReactNode } from 'react'
import { setSnackbarActions } from '@/utils/toast'

function SnackbarActionsRegistrar() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()

  useEffect(() => {
    setSnackbarActions(enqueueSnackbar, closeSnackbar)
  }, [enqueueSnackbar, closeSnackbar])

  return null
}

type AppSnackbarProviderProps = {
  children: ReactNode
}

export default function AppSnackbarProvider({ children }: AppSnackbarProviderProps) {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      autoHideDuration={5000}
    >
      <SnackbarActionsRegistrar />
      {children}
    </SnackbarProvider>
  )
}
