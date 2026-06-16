import type {
  EnqueueSnackbar,
  OptionsObject,
  ProviderContext,
  SnackbarKey,
} from 'notistack'

let enqueueSnackbar: EnqueueSnackbar | null = null
let closeSnackbar: ProviderContext['closeSnackbar'] | null = null

export function setSnackbarActions(
  enqueue: EnqueueSnackbar,
  close: ProviderContext['closeSnackbar'],
): void {
  enqueueSnackbar = enqueue
  closeSnackbar = close
}

const defaultOptions: OptionsObject = {
  preventDuplicate: true,
}

function show(
  message: string,
  variant: 'default' | 'error' | 'success' | 'warning' | 'info',
  options?: OptionsObject,
): SnackbarKey {
  if (!enqueueSnackbar) {
    console.warn('[toast] SnackbarProvider not mounted:', message)
    return ''
  }

  return enqueueSnackbar(message, { variant, ...defaultOptions, ...options })
}

export const toast = {
  error: (message: string, options?: OptionsObject) =>
    show(message, 'error', options),
  success: (message: string, options?: OptionsObject) =>
    show(message, 'success', options),
  info: (message: string, options?: OptionsObject) =>
    show(message, 'info', options),
  warning: (message: string, options?: OptionsObject) =>
    show(message, 'warning', options),
  close: (key: SnackbarKey) => {
    closeSnackbar?.(key)
  },
}
