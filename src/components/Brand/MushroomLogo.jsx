import { useId } from 'react'

/**
 * MushroomLogo — stylized SVG inspired by Pleurotus djamor (Pink Oyster).
 * Renders a clustered cap silhouette with a psychedelic pink-violet-cyan gradient.
 * Pure SVG so it stays sharp at any size and animates well.
 */
export default function MushroomLogo({ size = 40, glow = true, className = '' }) {
  const reactId = useId()
  const id = `djamor-grad-${reactId.replace(/:/g, '')}`
  const stemId = `djamor-stem-${reactId.replace(/:/g, '')}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 4px 14px rgba(236, 72, 153, 0.45))' } : undefined}
      aria-label="IFungi mushroom logo"
      role="img"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff85b3" />
          <stop offset="0.55" stopColor="#ec4899" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={stemId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbeaf3" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd9e8" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* back cap (smaller, behind) */}
      <path
        d="M14 26c0-7 6-12 13-12 6 0 11 4 12 10-2-1-5-2-8-2-7 0-13 4-15 8-1-1-2-2-2-4z"
        fill={`url(#${id})`}
        opacity="0.7"
      />

      {/* main cap — fan shape evoking oyster cluster */}
      <path
        d="M8 32c0-12 11-22 24-22s24 10 24 22c0 4-2 6-5 6H13c-3 0-5-2-5-6z"
        fill={`url(#${id})`}
      />

      {/* gill lines (subtle) */}
      <g stroke="#fbeaf3" strokeOpacity="0.32" strokeWidth="0.8" strokeLinecap="round">
        <line x1="32" y1="36" x2="32" y2="48" />
        <line x1="26" y1="36" x2="22" y2="48" />
        <line x1="20" y1="36" x2="14" y2="48" />
        <line x1="38" y1="36" x2="42" y2="48" />
        <line x1="44" y1="36" x2="50" y2="48" />
      </g>

      {/* stem cluster — slim merged base */}
      <path
        d="M24 38h6c1 0 2 1 2 2v12c0 1-1 2-2 2h-6c-1 0-2-1-2-2V40c0-1 1-2 2-2z"
        fill={`url(#${stemId})`}
        opacity="0.85"
      />
      <path
        d="M34 38h6c1 0 2 1 2 2v10c0 1-1 2-2 2h-6c-1 0-2-1-2-2V40c0-1 1-2 2-2z"
        fill={`url(#${stemId})`}
        opacity="0.7"
      />

      {/* tiny highlight on cap */}
      <ellipse cx="22" cy="20" rx="6" ry="2.2" fill="#fff" opacity="0.32" />
    </svg>
  )
}
