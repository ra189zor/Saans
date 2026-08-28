import { useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { MAX_DURATION_DAYS, scoreSymptoms } from '../data/scoring.js'

const TOGGLES = [
  { id: 'weightLoss', label: 'Weight loss or poor weight gain?' },
  { id: 'lymphNodes', label: 'Swollen or matted lymph nodes?' },
  { id: 'householdTb', label: 'Anyone at home had TB in the last 12 months?' },
  { id: 'fastBreathing', label: 'Fast or difficult breathing?' },
]

export default function SymptomMatrixScreen({
  lang,
  onLangChange,
  onCalculate,
}) {
  const [coughDays, setCoughDays] = useState(0)
  const [feverDays, setFeverDays] = useState(0)
  const [flags, setFlags] = useState({
    weightLoss: false,
    lymphNodes: false,
    householdTb: false,
    fastBreathing: false,
  })
  const [aiNote, setAiNote] = useState(false)

  function submit() {
    onCalculate(scoreSymptoms({ coughDays, feverDays, ...flags }))
  }

  return (
    <Screen fill>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        <DurationSlider
          id="cough-days"
          label="Cough duration"
          value={coughDays}
          onChange={setCoughDays}
        />
        <div className="mt-8 md:mt-10">
          <DurationSlider
            id="fever-days"
            label="Fever duration"
            value={feverDays}
            onChange={setFeverDays}
          />
        </div>

        <div className="mt-9 flex flex-col gap-3 md:mt-11 md:gap-4">
          {TOGGLES.map((toggle) => (
            <ToggleRow
              key={toggle.id}
              label={toggle.label}
              checked={flags[toggle.id]}
              onChange={() =>
                setFlags((prev) => ({ ...prev, [toggle.id]: !prev[toggle.id] }))
              }
            />
          ))}
        </div>

        <div className="mt-9 md:mt-11">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <SecondaryButton onClick={() => setAiNote(true)}>
              Scan X-ray
            </SecondaryButton>
            <SecondaryButton onClick={() => setAiNote(true)}>
              Record Cough
            </SecondaryButton>
          </div>
          {aiNote && (
            <p
              aria-live="polite"
              className="mt-3 text-sm leading-relaxed text-faint md:text-base"
            >
              AI feature coming next
            </p>
          )}
        </div>
      </main>

      <footer className={`${COLUMN} pt-4 pb-8 md:pb-12`}>
        <button
          type="button"
          onClick={submit}
          className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover md:min-h-[5.5rem] md:text-2xl"
        >
          Calculate Risk Score
        </button>
      </footer>
    </Screen>
  )
}

function DurationSlider({ id, label, value, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label
          htmlFor={id}
          className="text-xl leading-snug font-medium text-fg md:text-2xl"
        >
          {label}
        </label>
        <output
          htmlFor={id}
          className="font-display shrink-0 text-xl font-semibold text-teal tabular-nums md:text-2xl"
        >
          {value} {value === 1 ? 'day' : 'days'}
        </output>
      </div>

      <input
        id={id}
        type="range"
        min="0"
        max={MAX_DURATION_DAYS}
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 w-full cursor-pointer accent-teal"
      />

      <div className="mt-1 flex justify-between text-[0.6875rem] text-faint">
        <span>0</span>
        <span>{MAX_DURATION_DAYS} days</span>
      </div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    /* The whole row is the target, not just the switch. */
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex min-h-[4.5rem] w-full items-center justify-between gap-5 rounded-xl border border-hairline bg-surface px-5 py-4 text-left transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-h-[5rem] md:px-6"
    >
      <span className="text-base leading-snug font-medium text-fg md:text-lg">
        {label}
      </span>

      <span
        aria-hidden="true"
        className={`flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition-colors duration-150 md:h-10 md:w-[4.5rem] ${
          checked ? 'bg-teal' : 'bg-faint'
        }`}
      >
        <span
          className={`h-7 w-7 rounded-full bg-fg transition-transform duration-150 md:h-8 md:w-8 ${
            checked ? 'translate-x-7 md:translate-x-8' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[4rem] items-center justify-center rounded-xl border border-hairline bg-surface px-4 text-base font-semibold text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[4.5rem] md:text-lg"
    >
      {children}
    </button>
  )
}
