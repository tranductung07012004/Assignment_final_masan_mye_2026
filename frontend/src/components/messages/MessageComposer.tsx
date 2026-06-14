import ImageIcon from '@mui/icons-material/Image'
import SendIcon from '@mui/icons-material/Send'
import StickyNote2Icon from '@mui/icons-material/StickyNote2'
import VideocamIcon from '@mui/icons-material/Videocam'
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
} from '@mui/material'
import { useRef, useState, type ChangeEvent } from 'react'
import StickerPicker from '@/components/messages/StickerPicker'

type MessageComposerProps = {
  draft: string
  onDraftChange: (value: string) => void
  onSend: () => void
  onImageSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onVideoSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onStickerSelect: (stickerId: string) => void
  imageUploading: boolean
  videoUploading: boolean
  videoUploadProgress: number
}

export default function MessageComposer({
  draft,
  onDraftChange,
  onSend,
  onImageSelected,
  onVideoSelected,
  onStickerSelect,
  imageUploading,
  videoUploading,
  videoUploadProgress,
}: MessageComposerProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const stickerButtonRef = useRef<HTMLButtonElement>(null)
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false)
  const mediaUploading = imageUploading || videoUploading

  return (
    <Box sx={{ bgcolor: 'background.paper' }}>
      {videoUploading && (
        <LinearProgress
          variant="determinate"
          value={videoUploadProgress}
          sx={{ borderRadius: 0 }}
        />
      )}
      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onImageSelected}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          hidden
          onChange={onVideoSelected}
        />
        <IconButton
          aria-label="Attach image"
          disabled={mediaUploading}
          onClick={() => imageInputRef.current?.click()}
        >
          {imageUploading ? <CircularProgress size={20} /> : <ImageIcon />}
        </IconButton>
        <IconButton
          aria-label="Attach video"
          disabled={mediaUploading}
          onClick={() => videoInputRef.current?.click()}
        >
          {videoUploading ? <CircularProgress size={20} /> : <VideocamIcon />}
        </IconButton>
        <IconButton
          ref={stickerButtonRef}
          aria-label="Send sticker"
          disabled={mediaUploading}
          onClick={() => setStickerPickerOpen(true)}
        >
          <StickyNote2Icon />
        </IconButton>
        <StickerPicker
          anchorEl={stickerButtonRef.current}
          open={stickerPickerOpen}
          onClose={() => setStickerPickerOpen(false)}
          onSelect={onStickerSelect}
          disabled={mediaUploading}
        />
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    color="primary"
                    disabled={!draft.trim() || mediaUploading}
                    onClick={onSend}
                  >
                    <SendIcon />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
    </Box>
  )
}
