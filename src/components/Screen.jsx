/**
 * Full-height shell: safe areas, charcoal canvas, shared column width.
 *
 * `fill` pins the shell to the viewport instead of letting it grow, which is
 * what gives an inner `flex-1 overflow-y-auto` a bounded height to scroll
 * against — use it on screens whose copy can outrun a short display, so the
 * action in the footer always stays reachable.
 */
export default function Screen({ children, fill = false }) {
  return (
    <div
      className={`flex flex-col bg-canvas ${
        fill ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </div>
  )
}

/** Shared horizontal rhythm for every screen body and footer. */
export const COLUMN = 'mx-auto w-full max-w-md px-6 md:max-w-xl md:px-10'
