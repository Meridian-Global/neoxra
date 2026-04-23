type NeoxraLogoProps = {
  className?: string
  size?: number
}

export default function NeoxraLogo({ className, size = 36 }: NeoxraLogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 48 48"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" fill="url(#logoGrad)" r="23" stroke="color-mix(in srgb, var(--accent) 35%, transparent)" strokeWidth="2" />
      <path
        d="M13 31c3-7.333 7.167-11 12.5-11 3.667 0 6.833 1.833 9.5 5.5"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M16 24.5c2.667-5 5.833-7.5 9.5-7.5 2.667 0 5 1.167 7 3.5"
        stroke="rgba(255,255,255,0.7)"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <path d="M31 15l5-5" stroke="white" strokeLinecap="round" strokeWidth="3" />
      <circle cx="37.5" cy="9.5" fill="white" r="2.5" />
    </svg>
  )
}
