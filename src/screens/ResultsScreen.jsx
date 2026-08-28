import { useEffect, useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import {
  SOURCE_NOTE,
  CONTACT_RULE,
  DECISION_TREAT,
  DECISION_NO_TREAT,
} from '../data/scoring.js'

export default function ResultsScreen({
  lang,
  onLangChange,
  score,
  contactPositive,
  highRisk,
  referralCode,
  onRestart,
}) {
  const [assistantNote, setAssistantNote] = useState(false)

  /* A close/household contact goes straight to treatment: no score is
     calculated, so no score or breakdown is shown. */
  const treat = contactPositive || score.treat

  return (
    <Screen fill>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        {highRisk && (
          <p className="mb-6 inline-block rounded-md border border-amber px-4 py-2 text-[0.5625rem] font-medium tracking-[0.16em] text-amber uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
            High Risk · Fast Track
          </p>
        )}

        {contactPositive ? (
          <ResultCard
            tone="orange"
            title="TB Treatment Indicated"
            lines={[
              CONTACT_RULE,
              'Close or household TB contact in the previous 12 months. Contact history alone indicates treatment; no symptom score is calculated.',
              `Refer to nearest PHC with referral code ${referralCode}.`,
            ]}
          />
        ) : (
          <>
            <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
              Risk Score · Algorithm {score.algorithm}
            </p>
            <AnimatedScore value={score.total} />

            <section className="mt-8 border-t border-hairline pt-6 md:mt-10">
              <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
                Reasoning
              </p>

              {score.items.length === 0 ? (
                <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">
                  No scoring findings recorded.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {score.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <span className="text-base leading-snug text-fg md:text-lg">
                        {item.label}
                      </span>
                      <span className="font-display shrink-0 text-base font-semibold text-muted tabular-nums md:text-lg">
                        {item.points > 0 ? `+${item.points}` : item.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-8 md:mt-10">
              {treat ? (
                <ResultCard
                  tone="orange"
                  title="TB Treatment Indicated"
                  lines={[
                    DECISION_TREAT,
                    `Refer to nearest PHC with referral code ${referralCode}.`,
                  ]}
                />
              ) : (
                <ResultCard
                  tone="green"
                  title="Treatment Not Indicated"
                  lines={[
                    DECISION_NO_TREAT,
                    ...(highRisk
                      ? ['High-risk child — keep a low threshold for re-evaluation.']
                      : []),
                  ]}
                />
              )}
            </div>
          </>
        )}

        <p className="mt-8 border-t border-hairline pt-5 text-xs leading-relaxed text-faint md:text-sm">
          {SOURCE_NOTE}
        </p>

        {assistantNote && (
          <p
            aria-live="polite"
            className="mt-4 text-sm leading-relaxed text-faint md:text-base"
          >
            AI feature coming next
          </p>
        )}
      </main>

      <footer
        className={`${COLUMN} flex flex-col gap-3 pt-4 pb-8 md:gap-4 md:pb-12`}
      >
        <button
          type="button"
          onClick={() => setAssistantNote(true)}
          className="flex min-h-[4rem] w-full items-center justify-center rounded-xl border border-hairline bg-surface px-8 text-base font-semibold text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[4.5rem] md:text-lg"
        >
          Ask WHO Assistant
        </button>

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

/**
 * Counts up to the score on a timer rather than requestAnimationFrame, so it
 * still resolves on displays that are not compositing. Reduced motion jumps
 * straight to the final value.
 */
function AnimatedScore({ value }) {
  const [shown, setShown] = useState(() =>
    prefersReducedMotion() || value <= 0 ? value : 0
  )

  useEffect(() => {
    if (prefersReducedMotion() || value <= 0) {
      setShown(value)
      return
    }

    setShown(0)
    let current = 0
    const stepMs = Math.max(24, Math.round(650 / value))
    const timer = setInterval(() => {
      current += 1
      setShown(current)
      if (current >= value) clearInterval(timer)
    }, stepMs)

    return () => clearInterval(timer)
  }, [value])

  return (
    <p
      aria-label={`Risk score ${value}`}
      className="font-display mt-2 text-[4.5rem] leading-none font-semibold tracking-[-0.03em] text-fg tabular-nums md:text-[6rem]"
    >
      {shown}
    </p>
  )
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function ResultCard({ tone, title, lines }) {
  const palette =
    tone === 'orange'
      ? 'border-result-orange/35 bg-result-orange/10'
      : 'border-result-green/35 bg-result-green/10'
  const heading = tone === 'orange' ? 'text-result-orange' : 'text-result-green'

  return (
    <div className={`rounded-xl border p-5 md:p-6 ${palette}`}>
      <p
        className={`text-xs font-bold tracking-[0.16em] uppercase md:text-sm md:tracking-[0.2em] ${heading}`}
      >
        {title}
      </p>
      {lines.map((line, i) => (
        <p
          key={line}
          className={
            i === 0
              ? 'mt-3 text-base leading-relaxed text-fg md:text-lg'
              : 'mt-2.5 text-sm leading-relaxed text-muted md:text-base'
          }
        >
          {line}
        </p>
      ))}
    </div>
  )
}
