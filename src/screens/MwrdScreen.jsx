import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { useI18n } from '../i18n/index.jsx'
import BackLink from '../components/BackLink.jsx'

/**
 * Rapid diagnostic step, asked after risk stratification. A positive mWRD or
 * LF-LAM result starts treatment immediately; every other answer continues to
 * the contact question.
 */
const OPTIONS = [
  { id: 'detected', positive: true },
  { id: 'notDetected' },
  { id: 'pending' },
  { id: 'notPerformed' },
]

export default function MwrdScreen({ onAnswer, onBack }) {
  const { t } = useI18n()
  return (
    <Screen fill>
      <TopBar />

      <main
        className={`${COLUMN} min-h-0 flex-1 overflow-y-auto pt-6 md:pt-10`}
      >
        <BackLink onClick={onBack} />

        <h1 className="mt-6 text-[1.5rem] leading-snug font-medium text-balance text-fg md:text-[2.125rem] md:leading-[1.3]">
          {t('mwrd.question')}
        </h1>
      </main>

      <footer className={`${COLUMN} pt-8 pb-8 md:pt-10 md:pb-12`}>
        <div className="flex flex-col gap-3 md:gap-4">
          {OPTIONS.map((option) => (
            <ChoiceButton
              key={option.id}
              onClick={() => onAnswer(Boolean(option.positive))}
            >
              {t(`mwrd.${option.id}`)}
            </ChoiceButton>
          ))}
        </div>
      </footer>
    </Screen>
  )
}

function ChoiceButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[4.5rem] w-full items-center rounded-xl border border-hairline bg-surface px-6 py-4 text-start text-lg leading-snug font-semibold text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[5rem] md:px-8 md:text-xl"
    >
      {children}
    </button>
  )
}
