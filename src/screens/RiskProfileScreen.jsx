import { useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { useI18n } from '../i18n/index.jsx'
import { GuideImage } from '../components/Guide.jsx'

const MUAC_BANDS = [
  { id: 'red', fill: 'bg-muac-red', text: 'text-white' },
  { id: 'yellow', fill: 'bg-muac-yellow', text: 'text-canvas' },
  { id: 'green', fill: 'bg-muac-green', text: 'text-white' },
]

/** The age gate collects completed years, so “under 24 months” is years < 2. */
const FAST_TRACK_AGE_YEARS = 2

function formatAge(years, t) {
  if (years === null || years === undefined) return t('riskProfile.ageNotRecorded')
  if (years === 0) return t('riskProfile.ageUnderOne')
  return years === 1
    ? t('riskProfile.ageOneYear')
    : t('riskProfile.ageYears', { count: years })
}

export default function RiskProfileScreen({
  ageYears,
  fastTrack,
  onContinue,
}) {
  const [hivPositive, setHivPositive] = useState(null)
  const [muac, setMuac] = useState(null)
  const { t } = useI18n()

  const answered = hivPositive !== null && muac !== null

  const highRisk =
    answered &&
    (ageYears < FAST_TRACK_AGE_YEARS ||
      hivPositive === true ||
      muac === 'red' ||
      fastTrack)

  return (
    <Screen fill>
      <TopBar />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-5">
          <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
            {t('riskProfile.ageLabel')}
          </p>
          <p className="text-base font-medium text-fg md:text-lg">
            {formatAge(ageYears, t)}
          </p>
        </div>

        <section className="pt-8 md:pt-10">
          <h2 className="text-xl leading-snug font-medium text-balance text-fg md:text-2xl">
            {t('riskProfile.hivQuestion')}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:gap-4">
            <OptionButton
              selected={hivPositive === true}
              onClick={() => setHivPositive(true)}
>
              {t('common.yes')}
            </OptionButton>
            <OptionButton
              selected={hivPositive === false}
              onClick={() => setHivPositive(false)}
>
              {t('common.no')}
            </OptionButton>
          </div>
        </section>

        <section className="pt-9 md:pt-11">
          <h2 className="text-xl leading-snug font-medium text-balance text-fg md:text-2xl">
            {t('riskProfile.muacQuestion')}
          </h2>

          {/* Above the colour buttons, not below: reading the tape is the
              step that has to happen before any of them can be chosen. */}
          <div className="mt-4 md:mt-5">
            <GuideImage guideKey="muac" />
          </div>

          <div className="mt-4 flex flex-col gap-3 md:mt-5 md:gap-4">
            {MUAC_BANDS.map((band) => (
              <MuacButton
                key={band.id}
                band={band}
                t={t}
                selected={muac === band.id}
                onClick={() => setMuac(band.id)}
              />
            ))}
          </div>
        </section>

        {answered && (
          <section className="pt-9 md:pt-11">
            {highRisk ? (
              <p className="inline-block rounded-md border border-amber px-4 py-2 text-[0.5625rem] font-medium tracking-[0.16em] text-amber uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
                {t('riskProfile.highRiskBadge')}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-faint md:text-base">
                {t('riskProfile.whoAdvice')}
              </p>
            )}
          </section>
        )}
      </main>

      <footer className={`${COLUMN} pt-4 pb-8 md:pb-12`}>
        <button
          type="button"
          onClick={() => onContinue(highRisk)}
          disabled={!answered}
          className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover disabled:cursor-not-allowed disabled:bg-surface disabled:text-faint md:min-h-[5.5rem] md:text-2xl"
        >
          {t('riskProfile.continue')}
        </button>
      </footer>
    </Screen>
  )
}

function OptionButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'flex min-h-[4.5rem] items-center justify-center rounded-xl border-2 bg-surface px-6 text-xl font-bold transition-colors duration-150 outline-none select-none',
        'focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'md:min-h-[5rem] md:text-2xl',
        selected
          ? 'border-teal text-fg'
          : 'border-hairline text-muted hover:bg-surface-hover',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function MuacButton({ band, selected, onClick, t }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'flex min-h-[5rem] w-full items-center justify-between gap-4 rounded-xl border-2 px-6 py-4 text-start transition-colors duration-150 outline-none select-none',
        'focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'md:min-h-[5.75rem] md:px-7',
        band.fill,
        band.text,
        /* Selection is a border, never a glow. */
        selected ? 'border-fg' : 'border-transparent',
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className="block text-[0.5625rem] font-bold tracking-[0.18em] uppercase opacity-80 md:text-[0.6875rem]">
          {t(`riskProfile.muac.${band.id}.name`)}
        </span>
        <span className="mt-1 block text-lg leading-snug font-semibold md:text-xl">
          {t(`riskProfile.muac.${band.id}.description`)}
        </span>
      </span>

      {selected && (
        <svg
          className="h-6 w-6 shrink-0 md:h-7 md:w-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </button>
  )
}
