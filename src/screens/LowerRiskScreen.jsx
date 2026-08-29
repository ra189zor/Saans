import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { LOWER_RISK_GUIDANCE, SOURCE_NOTE } from '../data/scoring.js'

/**
 * Lower-risk child on a first visit: the algorithm treats the likely non-TB
 * cause first and re-evaluates, rather than scoring now. Scoring is not run.
 */
export default function LowerRiskScreen({
  lang,
  onLangChange,
  onScheduleFollowUp,
}) {
  return (
    <Screen fill>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        <div className="rounded-xl border border-hairline bg-surface p-5 md:p-6">
          <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase md:text-sm md:tracking-[0.2em]">
            Lower Risk · Not Scored
          </p>
          <p className="mt-3 text-base leading-relaxed text-fg md:text-lg">
            {LOWER_RISK_GUIDANCE}
          </p>
        </div>

        <p className="mt-8 border-t border-hairline pt-5 text-xs leading-relaxed text-faint md:text-sm">
          {SOURCE_NOTE}
        </p>
      </main>

      <footer className={`${COLUMN} pt-4 pb-8 md:pb-12`}>
        <button
          type="button"
          onClick={onScheduleFollowUp}
          className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover md:min-h-[5.5rem] md:text-2xl"
        >
          Schedule follow-up
        </button>
      </footer>
    </Screen>
  )
}
