import { useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import BackLink from '../components/BackLink.jsx'

export default function TriageScreen({
  questions,
  lang,
  onLangChange,
  onComplete,
  onExit,
}) {
  const [index, setIndex] = useState(0)
  // id -> whether that sign fired. Every question is asked; classification
  // happens once, after the last answer.
  const [detected, setDetected] = useState({})
  const question = questions[index]
  const total = questions.length

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
    <Screen>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <main className={`${COLUMN} flex flex-1 flex-col pt-6 md:pt-10`}>
        <Progress current={index + 1} total={total} onBack={goBack} />

        {/* Keyed so each question replays the entrance transition. */}
        <div
          key={question.id}
          className="animate-question flex flex-1 items-center"
        >
          <h1
            id="question-text"
            className="text-[1.75rem] leading-snug font-medium text-balance text-fg md:text-[2.5rem] md:leading-[1.25]"
          >
            {question.text}
          </h1>
        </div>
      </main>

      <footer className={`${COLUMN} pt-8 pb-8 md:pt-10 md:pb-12`}>
        <div className="flex flex-col gap-3 md:gap-4">
          <ChoiceButton onClick={() => answer(true)}>YES</ChoiceButton>
          <ChoiceButton onClick={() => answer(false)}>NO</ChoiceButton>
        </div>
      </footer>
    </Screen>
  )
}

function Progress({ current, total, onBack }) {
  const pct = (current / total) * 100

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <BackLink onClick={onBack} />

        <p
          aria-live="polite"
          className="text-xs font-medium tracking-[0.16em] text-muted uppercase md:text-sm"
        >
          Question {current} of {total}
        </p>
      </div>

      <div
        className="mt-3 h-0.5 w-full overflow-hidden bg-hairline"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Question ${current} of ${total}`}
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
