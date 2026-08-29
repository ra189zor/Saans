import { useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import BackLink from '../components/BackLink.jsx'
import { CXR_ITEMS, cxrIdFromLabel } from '../data/scoring.js'

/**
 * The AI pre-checks features it suspects; the health worker confirms or edits
 * before anything is scored. Nothing here is decided by the model alone.
 */
export default function XrayFeaturesScreen({
  lang,
  onLangChange,
  analysis,
  onConfirm,
  onBack,
}) {
  const [selected, setSelected] = useState(() => {
    const initial = {}
    for (const suggestion of analysis?.suggested_cxr_features ?? []) {
      const id = cxrIdFromLabel(suggestion)
      if (id) initial[id] = true
    }
    return initial
  })

  const sumB = CXR_ITEMS.reduce(
    (total, item) => (selected[item.id] ? total + item.points : total),
    0
  )

  const probability = analysis?.tb_probability
  const percent =
    typeof probability === 'number' ? Math.round(probability * 100) : null

  return (
    <Screen fill>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        <BackLink onClick={onBack} />

        <h1 className="mt-6 text-[1.5rem] leading-snug font-medium text-balance text-fg md:text-[2rem] md:leading-[1.3]">
          Confirm chest X-ray features
        </h1>

        {analysis?.heatmap_overlay && (
          <figure className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
            <img
              src={analysis.heatmap_overlay}
              alt="Chest X-ray with model attention heatmap overlay"
              className="block w-full"
            />
            <figcaption className="flex items-baseline justify-between gap-4 border-t border-hairline px-5 py-4">
              <span className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
                Model TB probability
              </span>
              <span className="font-display text-xl font-semibold text-fg tabular-nums md:text-2xl">
                {percent === null ? '—' : `${percent}%`}
              </span>
            </figcaption>
          </figure>
        )}

        <p className="mt-5 text-sm leading-relaxed text-faint md:text-base">
          Suggestions are pre-checked from the image analysis. Confirm or change
          them before scoring.
        </p>

        <div className="mt-5 flex flex-col gap-3 md:gap-4">
          {CXR_ITEMS.map((item) => (
            <FeatureRow
              key={item.id}
              label={item.label}
              points={item.points}
              checked={Boolean(selected[item.id])}
              onChange={() =>
                setSelected((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
              }
            />
          ))}
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-hairline pt-5">
          <span className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
            Sum B
          </span>
          <span className="font-display text-xl font-semibold text-fg tabular-nums md:text-2xl">
            {sumB}
          </span>
        </div>
      </main>

      <footer className={`${COLUMN} pt-4 pb-8 md:pb-12`}>
        <button
          type="button"
          onClick={() => onConfirm(selected)}
          className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover md:min-h-[5.5rem] md:text-2xl"
        >
          Confirm and calculate
        </button>
      </footer>
    </Screen>
  )
}

function FeatureRow({ label, points, checked, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`flex min-h-[4.5rem] w-full items-center justify-between gap-4 rounded-xl border bg-surface px-5 py-4 text-left transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-h-[5rem] md:px-6 ${
        checked ? 'border-teal' : 'border-hairline'
      }`}
    >
      <span className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 md:h-8 md:w-8 ${
            checked ? 'border-teal bg-teal text-white' : 'border-faint text-transparent'
          }`}
        >
          <svg
            className="h-4 w-4 md:h-5 md:w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <span className="text-base leading-snug font-medium text-fg md:text-lg">
          {label}
        </span>
      </span>

      <span className="font-display shrink-0 text-base font-semibold text-muted tabular-nums md:text-lg">
        +{points}
      </span>
    </button>
  )
}
