export function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  )
}
