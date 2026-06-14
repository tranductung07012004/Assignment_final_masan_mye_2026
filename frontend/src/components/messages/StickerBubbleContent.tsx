import { Box, Typography } from '@mui/material'
import { useStickers } from '@/hooks/useStickers'

type StickerBubbleContentProps = {
  stickerId: string
}

export default function StickerBubbleContent({ stickerId }: StickerBubbleContentProps) {
  const { stickerById, loading } = useStickers()
  const url = stickerById[stickerId]

  if (url) {
    return (
      <Box
        component="img"
        src={url}
        alt={stickerId}
        sx={{
          display: 'block',
          width: 140,
          height: 140,
          objectFit: 'contain',
        }}
      />
    )
  }

  return (
    <Typography variant="body2" color="text.secondary">
      {loading ? '…' : `:${stickerId}:`}
    </Typography>
  )
}
