/**
 * Bespoke inline SVG Title Lockup for "Misión BITIES: Rumbo al Estadio"
 * Crafted with La Casa de Zolve's purple, orange (#e85d24) and turquoise (#328990) palette.
 */
export function TitleLockup() {
  return (
    <div className="flex flex-col items-center text-center select-none">
      <svg
        viewBox="0 0 360 122"
        className="w-full max-w-[320px] h-auto drop-shadow-[0_6px_18px_rgba(18,6,40,0.65)]"
        role="img"
        aria-label="Misión BITIES: Rumbo al Estadio"
      >
        <defs>
          <linearGradient id="bitiesGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="55%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#328990" />
            <stop offset="50%" stopColor="#46a8b0" />
            <stop offset="100%" stopColor="#328990" />
          </linearGradient>
        </defs>

        {/* Subtle twinkling concert stars */}
        <path d="M36 22 L39 29 L46 32 L39 35 L36 42 L33 35 L26 32 L33 29 Z" fill="#fde047" />
        <path d="M324 18 L326 24 L332 26 L326 28 L324 34 L322 28 L316 26 L322 24 Z" fill="#c4b5fd" />
        <circle cx="308" cy="48" r="3" fill="#e85d24" />
        <circle cx="52" cy="54" r="2.5" fill="#46a8b0" />

        {/* "MISIÓN" arched warm top word */}
        <text
          x="180"
          y="33"
          textAnchor="middle"
          fill="#f5f3ff"
          stroke="#2a1154"
          strokeWidth="6"
          paintOrder="stroke"
          fontFamily="Fredoka, sans-serif"
          fontWeight="700"
          fontSize="24"
          letterSpacing="3"
        >
          MISIÓN
        </text>

        {/* Bold centerpiece "BITIES" */}
        <text
          x="180"
          y="80"
          textAnchor="middle"
          fill="url(#bitiesGold)"
          stroke="#2a1154"
          strokeWidth="9"
          paintOrder="stroke"
          fontFamily="Fredoka, sans-serif"
          fontWeight="700"
          fontSize="54"
          letterSpacing="3"
        >
          BITIES
        </text>

        {/* Turquoise adventure banner ribbon: Rumbo al Estadio */}
        <path
          d="M52 91 L308 91 L298 104 L308 117 L52 117 L62 104 Z"
          fill="url(#ribbonGrad)"
          stroke="#1b0b38"
          strokeWidth="3"
        />
        <text
          x="180"
          y="109"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="Fredoka, sans-serif"
          fontWeight="600"
          fontSize="16"
          letterSpacing="1.2"
        >
          RUMBO AL ESTADIO
        </text>
      </svg>
    </div>
  );
}
