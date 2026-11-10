export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="112" fill="#1F3A2E" />
      <path d="M256 104 L384 196 L384 392 L128 392 L128 196 Z" fill="none" stroke="#F6F1E7" strokeWidth="22" strokeLinejoin="round" />
      <path d="M256 392 C252 330 256 290 256 250" stroke="#8FA98A" strokeWidth="20" strokeLinecap="round" fill="none" />
      <path d="M256 290 C214 286 192 254 196 220 C232 222 256 248 256 290 Z" fill="#8FA98A" />
      <path d="M256 262 C292 254 318 226 316 192 C282 196 258 222 256 262 Z" fill="#B8CDB0" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={26} />
      <span className="font-display text-[26px] leading-none text-forest">Greenhouse</span>
    </span>
  );
}
