import {
  Box,
  Button,
  CircularProgress,
  Popover,
  Typography,
} from '@mui/material'
import { useStickers } from '@/hooks/useStickers'

type StickerPickerProps = {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onSelect: (stickerId: string) => void
  disabled?: boolean
}

export default function StickerPicker({
  anchorEl,
  open,
  onClose,
  onSelect,
  disabled = false,
}: StickerPickerProps) {
  const { stickers, loading, error, reload } = useStickers()

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{
        paper: { sx: { p: 1.5, width: 280 } },
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
          <Button size="small" onClick={reload}>
            Retry
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
          }}
        >
          {stickers.map((sticker) => (
            <Box
              key={sticker.id}
              component="button"
              type="button"
              disabled={disabled}
              onClick={() => {
                onSelect(sticker.id)
                onClose()
              }}
              sx={{
                border: 'none',
                bgcolor: 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                p: 0.5,
                borderRadius: 1,
                opacity: disabled ? 0.5 : 1,
                '&:hover': disabled ? undefined : { bgcolor: 'action.hover' },
              }}
            >
              <Box
                component="img"
                src={sticker.url}
                alt={sticker.id}
                sx={{ width: 72, height: 72, objectFit: 'contain', display: 'block' }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Popover>
  )
}
