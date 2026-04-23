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
      <circle cx="24" cy="24" fill="#12121f" r="23" stroke="#f97316" strokeOpacity="0.35" strokeWidth="2" />
      <path
        d="M13 31c3-7.333 7.167-11 12.5-11 3.667 0 6.833 1.833 9.5 5.5"
        stroke="#f97316"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M16 24.5c2.667-5 5.833-7.5 9.5-7.5 2.667 0 5 1.167 7 3.5"
        stroke="#fb923c"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <path d="M31 15l5-5" stroke="#f97316" strokeLinecap="round" strokeWidth="3" />
      <circle cx="37.5" cy="9.5" fill="#f97316" r="2.5" />
    </svg>
  )
}
