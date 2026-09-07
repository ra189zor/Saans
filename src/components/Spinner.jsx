/**
 * A working indicator, for waits long enough that a label alone reads as
 * frozen.
 *
 * The first chest X-ray of a session loads TensorFlow and the DenseNet
 * weights, which takes tens of seconds. "Analyzing…" sitting still for that
 * long looks like a crash; something moving looks like work.
 *
 * Decoration only — the state it accompanies is announced separately, so this
 * is hidden from screen readers.
 */
export default function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
