export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="coimpactoB logo"
    >
      {/* Icono: C en círculo/naranja */}
      <rect x="0" y="2" width="28" height="28" rx="6" fill="#F26522" />
      <text
        x="14"
        y="22"
        textAnchor="middle"
        fill="white"
        fontSize="18"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        C
      </text>

      {/* Texto: coimpacto */}
      <text
        x="38"
        y="22"
        fill="currentColor"
        fontSize="18"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        coimpacto
      </text>

      {/* Texto: B en naranja */}
      <text
        x="126"
        y="22"
        fill="#F26522"
        fontSize="18"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        B
      </text>
    </svg>
  )
}
