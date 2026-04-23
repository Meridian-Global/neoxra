import { FaFacebookF, FaInstagram } from 'react-icons/fa'
import { SiThreads } from 'react-icons/si'
import GoogleColorLogo from '../GoogleColorLogo'

type PlatformIconProps = {
  platform: 'instagram' | 'seo' | 'threads' | 'facebook'
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: { container: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { container: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { container: 'h-12 w-12', icon: 'h-6 w-6' },
} as const

export function PlatformIcon({ platform, size = 'md' }: PlatformIconProps) {
  const classes = SIZE_CLASSES[size]

  if (platform === 'instagram') {
    return (
      <span className={`inline-flex items-center justify-center rounded-xl bg-gradient-instagram text-white ${classes.container}`}>
        <FaInstagram className={classes.icon} />
      </span>
    )
  }

  if (platform === 'seo') {
    return (
      <span className={`inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] ${classes.container}`}>
        <GoogleColorLogo className={classes.icon} />
      </span>
    )
  }

  if (platform === 'threads') {
    return (
      <span className={`inline-flex items-center justify-center rounded-xl bg-gradient-threads text-white ${classes.container}`}>
        <SiThreads className={classes.icon} />
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center justify-center rounded-xl bg-[var(--platform-facebook)] text-white ${classes.container}`}>
      <FaFacebookF className={classes.icon} />
    </span>
  )
}
