import { useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { useI18n } from '../i18n/index.jsx'
import BackLink from '../components/BackLink.jsx'
import { GuideImage } from '../components/Guide.jsx'
import { hasGuide } from '../data/guides.js'

export default function TriageScreen({
  questions,
  onComplete,
  onExit,
}) {
  const [index, setIndex] = useState(0)
  // id -> whether that sign fired. Every question is asked; classification
  // happens once, after the last answer.
  const [detected, setDetected] = useState({})
  const question = questions[index]
  const total = questions.length
  const { t } = useI18n()

  function answer(isYes) {
    // Each sign declares which answer fires it — Q1 is inverted, so a
    // child who cannot drink is the emergency.
    const fired = isYes === (question.triggerOn === 'yes')
    const next = { ...detected, [question.id]: fired }
    setDetected(next)

    if (index + 1 >= total) {
      onComplete(questions.filter((q) => next[q.id]))
      return
    }
    setIndex(index + 1)
  }

  function goBack() {
    if (index === 0) onExit()
    else setIndex(index - 1)
  }

  return (
    /* `fill` so the question and its picture scroll against a bounded height
       and YES/NO stay on screen — the answer must never be below the fold. */
    <Screen fill>
      <TopBar />

      <main className={`${COLUMN} flex min-h-0 flex-1 flex-col pt-6 md:pt-10`}>
        <Progress current={index + 1} total={total} onBack={goBack} t={t} />

        <div className="min-h-0 flex-1 overflow-y-auto py-6 md:py-8">
          {/* Keyed so each question replays the entrance transition.
              min-h-full centres a short question without clipping the top of
              a tall one, which plain justify-center on the scroller would. */}
          <div
            key={question.id}
            className="animate-question flex min-h-full flex-col justify-center gap-6 md:gap-8"
          >
            <h1
              id="question-text"
              className="text-[1.75rem] leading-snug font-medium text-balance text-fg md:text-[2.5rem] md:leading-[1.25]"
            >
              {t(`dangerSigns.${question.id}.text`)}
            </h1>

            {hasGuide(question.id) && <GuideImage guideKey={question.id} />}
          </div>
        </div>
      </main>

      <footer className={`${COLUMN} pt-8 pb-8 md:pt-10 md:pb-12`}>
        <div className="flex flex-col gap-3 md:gap-4">
          <ChoiceButton onClick={() => answer(true)}>
            {t('common.yesEmphatic')}
          </ChoiceButton>
          <ChoiceButton onClick={() => answer(false)}>
            {t('common.noEmphatic')}
          </ChoiceButton>
        </div>
      </footer>
    </Screen>
  )
}

function Progress({ current, total, onBack, t }) {
  const pct = (current / total) * 100

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <BackLink onClick={onBack} />

        <p
          aria-live="polite"
          className="text-xs font-medium tracking-[0.16em] text-muted uppercase md:text-sm"
        >
          {t('triage.progress', { current, total })}
        </p>
      </div>

      <div
        className="mt-3 h-0.5 w-full overflow-hidden bg-hairline"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={t('triage.progress', { current, total })}
      >
        <div
          className="h-full bg-teal transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ChoiceButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-describedby="question-text"
      className="flex min-h-[5.25rem] w-full items-center justify-center rounded-xl border border-hairline bg-surface px-8 text-2xl font-bold tracking-[0.08em] text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[6rem] md:text-3xl"
    >
      {children}
    </button>
  )
}
