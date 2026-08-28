import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'

/** Calm, non-alarming stop for children outside the validated age range. */
export default function OutOfScopeScreen({ lang, onLangChange, onBack }) {
  return (
    <Screen fill>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <main
        className={`${COLUMN} flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-10`}
      >
        <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
          Outside Validated Range
        </p>

        <p className="mt-5 text-[1.375rem] leading-snug font-medium text-balance text-fg md:text-[1.875rem] md:leading-[1.35]">
          Saans v0.1 is validated for children under 5 using the WHO IMCI
          framework.
        </p>

        <p className="mt-5 text-lg leading-relaxed text-muted md:text-xl">
          For children aged 5–9, please involve a clinician (ETAT
          framework).
        </p>
      </main>

      <footer className={`${COLUMN} pb-8 md:pb-12`}>
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl border border-hairline bg-surface px-8 text-xl font-bold tracking-tight text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[5.5rem] md:text-2xl"
        >
          Back
        </button>
      </footer>
    </Screen>
  )
}
