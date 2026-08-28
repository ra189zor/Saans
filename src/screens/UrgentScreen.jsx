import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'

export default function UrgentScreen({
  signs = [],
  lang,
  onLangChange,
  onRestart,
}) {
  return (
    <Screen fill>
      <TopBar lang={lang} onLangChange={onLangChange} />

      {/* Solid band rather than a glow: serious, but calm. */}
      <div role="alert" className="border-y border-danger-hover bg-danger">
        <div className={`${COLUMN} py-5 md:py-7`}>
          <p className="text-center text-lg font-bold tracking-[0.14em] text-white uppercase md:text-2xl md:tracking-[0.18em]">
            Danger Sign Detected
          </p>
        </div>
      </div>

      {/* Copy can outrun a short screen, so the body scrolls and the
          action stays pinned and reachable. */}
      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-8 md:py-10`}>
        <p className="text-[1.375rem] leading-snug font-medium text-balance text-fg md:text-[1.875rem] md:leading-[1.35]">
          The child may be seriously ill. This is not a TB diagnosis.
        </p>

        <p className="mt-5 text-lg leading-relaxed text-muted md:text-xl">
          Emergency care comes first: stabilize and refer to the nearest
          District Hospital immediately. TB evaluation will continue at the
          hospital.
        </p>

        {signs.length > 0 && (
          <div className="mt-8 border-l-2 border-danger pl-4 md:mt-10 md:pl-5">
            <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
              Detected
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg md:text-base">
              {signs.map((s) => s.label).join(', ')}
            </p>
          </div>
        )}
      </main>

      <footer className={`${COLUMN} pt-2 pb-8 md:pb-12`}>
        <button
          type="button"
          onClick={onRestart}
          className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover md:min-h-[5.5rem] md:text-2xl"
        >
          Start New Screening
        </button>
      </footer>
    </Screen>
  )
}
