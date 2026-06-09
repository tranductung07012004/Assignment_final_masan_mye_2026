import { Box } from '@mui/material'
import chatIcon from '@/assets/chat.svg'

type ChatAppLogoProps = {
  size?: number
}

export default function ChatAppLogo({ size = 36 }: ChatAppLogoProps) {
  return (
    <Box
      component="img"
      src={chatIcon}
      alt=""
      draggable={false}
      sx={{ width: size, height: size, display: 'block' }}
    />
  )
}
