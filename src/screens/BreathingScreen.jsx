import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'

export default function BreathingScreen({
  lang,
  onLangChange,
  onSevere,
  onNoSevere,
}) {
  return (
    <Screen fill>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <div role="alert" className="border-y border-amber-hover bg-amber">
        <div className={`${COLUMN} py-5 md:py-7`}>
          <p className="text-center text-lg font-bold tracking-[0.14em] text-white uppercase md:text-2xl md:tracking-[0.18em]">
            Breathing Problem Detected
          </p>
        </div>
      </div>

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-8 md:py-10`}>
        <p className="text-[1.5rem] leading-snug font-medium text-balance text-fg md:text-[2rem] md:leading-[1.3]">
          Check severity now.
        </p>
      </main>

      <footer className={`${COLUMN} pb-8 md:pb-12`}>
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Equal weight: neither severity answer is nudged. */}
          <SeverityButton onClick={onSevere}>
            Severe signs present (very severe chest indrawing, blue lips, or any
            danger sign)
          </SeverityButton>
          <SeverityButton onClick={onNoSevere}>No severe signs</SeverityButton>
        </div>
      </footer>
    </Screen>
  )
}

function SeverityButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[5.25rem] w-full items-center rounded-xl border border-hairline bg-surface px-6 py-5 text-left text-lg leading-snug font-semibold text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[6rem] md:px-8 md:text-xl"
    >
      {children}
    </button>
  )
}
