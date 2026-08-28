import { useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import {
  MAX_DURATION_DAYS,
  DURATION_THRESHOLD_DAYS,
  deriveFindings,
  scoreFindings,
} from '../data/scoring.js'
import { vitalThresholds, isTachypnoeic, isTachycardic } from '../data/vitals.js'

/* Cough and fever come from the sliders and the two vital-sign items from
   measured rates; these five are asked directly. */
const TOGGLES = [
  {
    id: 'lethargy',
    label: 'Persistent unexplained lethargy or reduced playfulness?',
  },
  { id: 'weightLoss', label: 'Weight loss or failure to thrive?' },
  { id: 'haemoptysis', label: 'Haemoptysis (coughing up blood)?' },
  { id: 'nightSweats', label: 'Night sweats?' },
  { id: 'lymphNodes', label: 'Painless, enlarged (swollen) lymph nodes?' },
]

export default function SymptomMatrixScreen({
  lang,
  onLangChange,
  ageYears,
  onCalculate,
}) {
  const [coughDays, setCoughDays] = useState(0)
  const [feverDays, setFeverDays] = useState(0)
  const [respiratoryRate, setRespiratoryRate] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [flags, setFlags] = useState({
    lethargy: false,
    weightLoss: false,
    haemoptysis: false,
    nightSweats: false,
    lymphNodes: false,
    tachypnoea: false,
    tachycardia: false,
  })
  const [aiNote, setAiNote] = useState(false)

  const thresholds = vitalThresholds(ageYears)

  function setFlag(id, value) {
    setFlags((prev) => ({ ...prev, [id]: value }))
  }

  /* Entering a rate auto-suggests the matching item. The toggle underneath
     stays manually overridable afterwards. */
  function onRespiratoryRate(value) {
    setRespiratoryRate(value)
    const suggested = isTachypnoeic(value, ageYears)
    if (suggested !== null) setFlag('tachypnoea', suggested)
  }

  function onHeartRate(value) {
    setHeartRate(value)
    const suggested = isTachycardic(value, ageYears)
    if (suggested !== null) setFlag('tachycardia', suggested)
  }

  function submit() {
    const findings = deriveFindings({ coughDays, feverDays, ...flags })
    onCalculate(scoreFindings(findings, { algorithm: 'B' }))
  }

  return (
    <Screen fill>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        <DurationSlider
          id="cough-days"
          label="Cough duration"
          qualifies="Counts as cough longer than 2 weeks"
          value={coughDays}
          onChange={setCoughDays}
        />

        <div className="mt-8 md:mt-10">
          <DurationSlider
            id="fever-days"
            label="Fever duration"
            qualifies="Counts as fever longer than 2 weeks"
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
              onChange={() => setFlag(toggle.id, !flags[toggle.id])}
            />
          ))}
        </div>

        <section className="mt-9 md:mt-11">
          <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
            Vital Signs · {thresholds.label}
          </p>

          <div className="mt-4 flex flex-col gap-3 md:gap-4">
            <RateField
              id="respiratory-rate"
              label="Respiratory rate"
              unit="breaths/min"
              hint={`Tachypnoea above ${thresholds.respiratory}/min at this age`}
              value={respiratoryRate}
              onChange={onRespiratoryRate}
            />
            <ToggleRow
              label="Tachypnoea?"
              checked={flags.tachypnoea}
              onChange={() => setFlag('tachypnoea', !flags.tachypnoea)}
            />

            <RateField
              id="heart-rate"
              label="Heart rate"
              unit="beats/min"
              hint={`Tachycardia above ${thresholds.heart}/min at this age`}
              value={heartRate}
              onChange={onHeartRate}
            />
            <ToggleRow
              label="Tachycardia?"
              checked={flags.tachycardia}
              onChange={() => setFlag('tachycardia', !flags.tachycardia)}
            />
          </div>
        </section>

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

function DurationSlider({ id, label, qualifies, value, onChange }) {
  const counts = value > DURATION_THRESHOLD_DAYS

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

      <p
        className={`mt-2 text-sm md:text-base ${counts ? 'text-teal' : 'text-faint'}`}
      >
        {counts ? qualifies : `Scores above ${DURATION_THRESHOLD_DAYS} days`}
      </p>
    </div>
  )
}

function RateField({ id, label, unit, hint, value, onChange }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-5 py-4 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <label
          htmlFor={id}
          className="text-base leading-snug font-medium text-fg md:text-lg"
        >
          {label}
        </label>

        <div className="flex shrink-0 items-baseline gap-2">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="––"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
            className="font-display w-20 rounded-lg border border-hairline bg-canvas px-3 py-2 text-center text-xl font-semibold text-fg outline-none placeholder:text-faint focus:border-teal focus-visible:ring-2 focus-visible:ring-teal md:w-24 md:text-2xl"
          />
          <span className="text-xs text-faint md:text-sm">{unit}</span>
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-faint md:text-sm">{hint}</p>
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
