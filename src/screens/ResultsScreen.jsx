import { useEffect, useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { useI18n } from '../i18n/index.jsx'
import { TREATMENT_THRESHOLD } from '../data/scoring.js'

export default function ResultsScreen({
  score,
  mwrdPositive,
  contactPositive,
  highRisk,
  referralCode,
  heatmapOverlay,
  onAskAssistant,
  onRestart,
}) {
  const { t } = useI18n()

  /* A positive mWRD/LF-LAM result, or a close/household contact, goes straight
     to treatment: no score is calculated, so no score or breakdown is shown. */
  const skipsScoring = mwrdPositive || contactPositive
  const treat = skipsScoring || score.treat

  const usedXray = !skipsScoring && score.algorithm === 'A'
  const symptomItems = skipsScoring
    ? []
    : score.items.filter((item) => item.group === 'symptom')
  const cxrItems = skipsScoring
    ? []
    : score.items.filter((item) => item.group === 'cxr')

  /** Scored items carry ids, not prose — compose the label in the active language. */
  function itemLabel(item) {
    if (item.group === 'cxr') return t(`cxrItems.${item.id}`)
    const label = t(`symptomItems.${item.id}`)
    return item.days == null
      ? label
      : t('results.itemWithDays', { label, count: item.days })
  }

  return (
    <Screen fill>
      <TopBar />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        {highRisk && (
          <p className="mb-6 inline-block rounded-md border border-amber px-4 py-2 text-[0.5625rem] font-medium tracking-[0.16em] text-amber uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
            {t('results.highRiskBadge')}
          </p>
        )}

        {skipsScoring ? (
          <ResultCard
            tone="orange"
            title={t('results.treatTitle')}
            lines={[
              t('results.immediateTreat'),
              mwrdPositive ? t('results.mwrdReason') : t('results.contactReason'),
              t('results.referral', { code: referralCode }),
            ]}
          />
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
                  {t('results.scoreLabel')}
                </p>
                <p className="mt-1 text-sm text-muted md:text-base">
                  {usedXray ? t('results.algorithmA') : t('results.algorithmB')}
                </p>
              </div>

              {heatmapOverlay && (
                <img
                  src={heatmapOverlay}
                  alt={t('results.heatmapAlt')}
                  className="h-16 w-16 shrink-0 rounded-lg border border-hairline object-cover md:h-20 md:w-20"
                />
              )}
            </div>

            <AnimatedScore value={score.total} label={t('results.scoreLabel')} />

            <section className="mt-8 border-t border-hairline pt-6 md:mt-10">
              <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
                {t('results.reasoning')}
              </p>

              {score.items.length === 0 ? (
                <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">
                  {t('results.noFindings')}
                </p>
              ) : (
                <>
                  <ScoreGroup
                    heading={usedXray ? t('results.sumAHeading') : null}
                    items={symptomItems}
                    total={usedXray ? score.symptomTotal : null}
                    emptyNote={t('results.noSymptomFindings')}
                    itemLabel={itemLabel}
                  />
                  {usedXray && (
                    <ScoreGroup
                      heading={t('results.sumBHeading')}
                      items={cxrItems}
                      total={score.cxrTotal}
                      emptyNote={t('results.noCxrFindings')}
                      itemLabel={itemLabel}
                    />
                  )}
                </>
              )}

              <p className="mt-6 border-t border-hairline pt-4 text-sm leading-relaxed text-muted md:text-base">
                {usedXray
                  ? t('results.thresholdWithXray', {
                      sumA: score.symptomTotal,
                      sumB: score.cxrTotal,
                      total: score.total,
                      threshold: TREATMENT_THRESHOLD,
                    })
                  : t('results.thresholdNoXray', {
                      total: score.total,
                      threshold: TREATMENT_THRESHOLD,
                    })}
              </p>
            </section>

            <div className="mt-8 md:mt-10">
              {treat ? (
                <ResultCard
                  tone="orange"
                  title={t('results.treatTitle')}
                  lines={[
                    t('results.decisionTreat'),
                    t('results.referral', { code: referralCode }),
                  ]}
                />
              ) : (
                <ResultCard
                  tone="green"
                  title={t('results.noTreatTitle')}
                  lines={[
                    t('results.decisionNoTreat'),
                    ...(highRisk ? [t('results.highRiskNote')] : []),
                  ]}
                />
              )}
            </div>
          </>
        )}

        <p className="mt-8 border-t border-hairline pt-5 text-xs leading-relaxed text-faint md:text-sm">
          {t('results.source')}
        </p>

      </main>

      <footer
        className={`${COLUMN} flex flex-col gap-3 pt-4 pb-8 md:gap-4 md:pb-12`}
      >
        <button
          type="button"
          onClick={onAskAssistant}
          className="flex min-h-[4rem] w-full items-center justify-center rounded-xl border border-hairline bg-surface px-8 text-base font-semibold text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[4.5rem] md:text-lg"
        >
          {t('results.askAssistant')}
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover md:min-h-[5.5rem] md:text-2xl"
        >
          {t('common.startNewScreening')}
        </button>
      </footer>
    </Screen>
  )
}

function ScoreGroup({ heading, items, total, emptyNote, itemLabel }) {
  return (
    <div className={heading ? 'mt-5 first:mt-4' : 'mt-4'}>
      {heading && (
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[0.5625rem] font-medium tracking-[0.14em] text-muted uppercase md:text-[0.625rem] md:tracking-[0.18em]">
            {heading}
          </p>
          {total !== null && (
            <span className="font-display shrink-0 text-sm font-semibold text-fg tabular-nums md:text-base">
              {total}
            </span>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-faint md:text-base">
          {emptyNote}
        </p>
      ) : (
        <ul className={`flex flex-col gap-3 ${heading ? 'mt-3' : ''}`}>
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4">
              <span className="text-base leading-snug text-fg md:text-lg">
                {itemLabel(item)}
              </span>
              <span
                dir="ltr"
                className="font-display shrink-0 text-base font-semibold text-muted tabular-nums md:text-lg"
              >
                {item.points > 0 ? `+${item.points}` : item.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Counts up to the score on a timer rather than requestAnimationFrame, so it
 * still resolves on displays that are not compositing. Reduced motion jumps
 * straight to the final value.
 */
function AnimatedScore({ value, label }) {
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
      dir="ltr"
      aria-label={`${label}: ${value}`}
      className="font-display mt-2 text-[4.5rem] leading-none font-semibold tracking-[-0.03em] text-fg tabular-nums md:text-[6rem] rtl:text-end"
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
