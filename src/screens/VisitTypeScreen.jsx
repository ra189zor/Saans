import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { useI18n } from '../i18n/index.jsx'
import BackLink from '../components/BackLink.jsx'

/**
 * Visit type gates the lower-risk pathway: a lower-risk child on a first
 * visit is treated for the likely non-TB cause and re-evaluated, and only
 * continues into scoring if symptoms persisted or worsened.
 */
export default function VisitTypeScreen({
  onAnswer,
  onBack,
}) {
  const { t } = useI18n()
  return (
    <Screen fill>
      <TopBar />

      <main
        className={`${COLUMN} min-h-0 flex-1 overflow-y-auto pt-6 md:pt-10`}
      >
        <BackLink onClick={onBack} />

        <h1 className="mt-6 text-[1.75rem] leading-snug font-medium text-balance text-fg md:text-[2.5rem] md:leading-[1.25]">
          {t('visitType.question')}
        </h1>
      </main>

      <footer className={`${COLUMN} pt-8 pb-8 md:pt-10 md:pb-12`}>
        <div className="flex flex-col gap-3 md:gap-4">
          <ChoiceButton onClick={() => onAnswer('first')}>
            {t('visitType.first')}
          </ChoiceButton>
          <ChoiceButton onClick={() => onAnswer('followUp')}>
            {t('visitType.followUp')}
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
      className="flex min-h-[5.25rem] w-full items-center rounded-xl border border-hairline bg-surface px-6 py-5 text-start text-lg leading-snug font-semibold text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[6rem] md:px-8 md:text-xl"
    >
      {children}
    </button>
  )
}
