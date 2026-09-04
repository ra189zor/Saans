import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { useI18n } from '../i18n/index.jsx'
import BackLink from '../components/BackLink.jsx'

/**
 * Official rule: a close or household TB contact in the previous 12 months
 * goes straight to treatment, bypassing the symptom score entirely.
 */
export default function ContactScreen({ onAnswer, onBack }) {
  const { t } = useI18n()
  return (
    <Screen>
      <TopBar />

      <main className={`${COLUMN} flex flex-1 flex-col pt-6 md:pt-10`}>
        <BackLink onClick={onBack} />

        <div className="flex flex-1 items-center">
          <h1 className="text-[1.75rem] leading-snug font-medium text-balance text-fg md:text-[2.5rem] md:leading-[1.25]">
            {t('contact.question')}
          </h1>
        </div>
      </main>

      <footer className={`${COLUMN} pt-8 pb-8 md:pt-10 md:pb-12`}>
        <div className="flex flex-col gap-3 md:gap-4">
          <ChoiceButton onClick={() => onAnswer(true)}>
            {t('common.yesEmphatic')}
          </ChoiceButton>
          <ChoiceButton onClick={() => onAnswer(false)}>
            {t('common.noEmphatic')}
          </ChoiceButton>
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
      className="flex min-h-[5.25rem] w-full items-center justify-center rounded-xl border border-hairline bg-surface px-8 text-2xl font-bold tracking-[0.08em] text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[6rem] md:text-3xl"
    >
      {children}
    </button>
  )
}
