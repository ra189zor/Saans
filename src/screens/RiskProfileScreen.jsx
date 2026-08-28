import { useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'

const MUAC_BANDS = [
  {
    id: 'red',
    name: 'Red',
    description: 'Severe malnutrition (below 115mm)',
    fill: 'bg-muac-red',
    text: 'text-white',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    description: 'Moderate malnutrition',
    fill: 'bg-muac-yellow',
    text: 'text-canvas',
  },
  {
    id: 'green',
    name: 'Green',
    description: 'Normal',
    fill: 'bg-muac-green',
    text: 'text-white',
  },
]

/** The age gate collects completed years, so “under 24 months” is years < 2. */
const FAST_TRACK_AGE_YEARS = 2

function formatAge(years) {
  if (years === null || years === undefined) return 'Not recorded'
  if (years === 0) return 'Under 1 year'
  return years === 1 ? '1 year' : `${years} years`
}

export default function RiskProfileScreen({
  lang,
  onLangChange,
  ageYears,
  fastTrack,
  onContinue,
}) {
  const [hivPositive, setHivPositive] = useState(null)
  const [muac, setMuac] = useState(null)

  const answered = hivPositive !== null && muac !== null

  const highRisk =
    answered &&
    (ageYears < FAST_TRACK_AGE_YEARS ||
      hivPositive === true ||
      muac === 'red' ||
      fastTrack)

  return (
    <Screen fill>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-5">
          <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
            Child Age
          </p>
          <p className="text-base font-medium text-fg md:text-lg">
            {formatAge(ageYears)}
          </p>
        </div>

        <section className="pt-8 md:pt-10">
          <h2 className="text-xl leading-snug font-medium text-balance text-fg md:text-2xl">
            Is the child known to be HIV positive?
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:gap-4">
            <OptionButton
              selected={hivPositive === true}
              onClick={() => setHivPositive(true)}
            >
              Yes
            </OptionButton>
            <OptionButton
              selected={hivPositive === false}
              onClick={() => setHivPositive(false)}
            >
              No
            </OptionButton>
          </div>
        </section>

        <section className="pt-9 md:pt-11">
          <h2 className="text-xl leading-snug font-medium text-balance text-fg md:text-2xl">
            What colour does the MUAC tape show?
          </h2>
          <div className="mt-4 flex flex-col gap-3 md:mt-5 md:gap-4">
            {MUAC_BANDS.map((band) => (
              <MuacButton
                key={band.id}
                band={band}
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
                High Risk · Fast Track
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-faint md:text-base">
                WHO advises: treat common causes first and re-evaluate in 1–2
                weeks. Continue this screening if symptoms persisted.
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
          Continue to Symptoms
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

function MuacButton({ band, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'flex min-h-[5rem] w-full items-center justify-between gap-4 rounded-xl border-2 px-6 py-4 text-left transition-colors duration-150 outline-none select-none',
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
          {band.name}
        </span>
        <span className="mt-1 block text-lg leading-snug font-semibold md:text-xl">
          {band.description}
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
