/** Understated mark: an abstract glasshouse silhouette with an emerging stem. */
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="96 80 320 340" className={className} aria-hidden>
      <path d="M256 112 L380 202 L380 392 L132 392 L132 202 Z" fill="none" stroke="#23382F" strokeWidth="24" strokeLinejoin="round" />
      <path d="M256 392 C252 336 256 296 256 258" stroke="#23382F" strokeWidth="22" strokeLinecap="round" fill="none" />
      <path d="M256 300 C212 296 190 262 194 226 C232 228 256 256 256 300 Z" fill="#23382F" />
      <path d="M256 270 C294 262 320 232 318 196 C282 200 258 228 256 270 Z" fill="#829985" />
    </svg>
  );
}

export function Wordmark({ className = "", size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <span className={`inline-flex items-center gap-2 text-forest ${className}`}>
      <Mark size={lg ? 30 : 22} />
      <span className={`font-display leading-none ${lg ? "text-[30px]" : "text-[23px]"}`}>Greenhouse</span>
    </span>
  );
}
