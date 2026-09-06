import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { useI18n } from '../i18n/index.jsx'

export default function UrgentScreen({
  signs = [],
  onRestart,
}) {
  const { t } = useI18n()
  return (
    <Screen fill>
      <TopBar />

      {/* Solid band rather than a glow: serious, but calm. */}
      <div role="alert" className="border-y border-danger-hover bg-danger">
        <div className={`${COLUMN} py-5 md:py-7`}>
          <p className="text-center text-lg font-bold tracking-[0.14em] text-white uppercase md:text-2xl md:tracking-[0.18em]">
            {t('urgent.band')}
          </p>
        </div>
      </div>

      {/* Copy can outrun a short screen, so the body scrolls and the
          action stays pinned and reachable. */}
      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-8 md:py-10`}>
        <p className="text-[1.375rem] leading-snug font-medium text-balance text-fg md:text-[1.875rem] md:leading-[1.35]">
          {t('urgent.lead')}
        </p>

        <p className="mt-5 text-lg leading-relaxed text-muted md:text-xl">
          {t('urgent.body')}
        </p>

        {signs.length > 0 && (
          <div className="mt-8 border-s-2 border-danger ps-4 md:mt-10 md:ps-5">
            <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
              {t('urgent.detected')}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg md:text-base">
              {signs
                .map((s) => t(`dangerSigns.${s.id}.label`))
                .join(t('common.listSeparator'))}
            </p>
          </div>
        )}
      </main>

      <footer className={`${COLUMN} pt-2 pb-8 md:pb-12`}>
        <button
          type="button"
          onClick={onRestart}
          className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover md:min-h-[5.5rem] md:text-2xl"
        >
          {t('common.startNewScreening')}
        </button>
      </footer>
    </Screen>
  )
}
