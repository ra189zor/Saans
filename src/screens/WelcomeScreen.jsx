import { Fragment } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { useI18n } from '../i18n/index.jsx'

export default function WelcomeScreen({ onStart }) {
  const { lang, t } = useI18n()
  return (
    <Screen>
      <TopBar />

      <main className={`${COLUMN} flex flex-1 flex-col justify-center py-10 text-center`}>
        <LungMark />

        <h1 className="font-display mt-9 text-[4.5rem] leading-none font-semibold tracking-[-0.03em] text-fg md:mt-12 md:text-[7rem]">
          Saans
        </h1>

        {/* The Urdu spelling belongs to the Urdu UI. Showing it under the
            English wordmark makes the English screen bilingual for no reason. */}
        {lang === 'ur' && (
          <p
            dir="rtl"
            lang="ur"
            className="font-urdu mt-2 text-[2.25rem] font-medium text-fg/80 md:mt-4 md:text-[3.5rem]"
          >
            سانس
          </p>
        )}

        <Divider parts={[t('welcome.dividerLeft'), t('welcome.dividerRight')]} />

        <p className="text-lg leading-relaxed text-muted md:text-2xl">
          {t('welcome.tagline')}
        </p>
      </main>

      <footer className={`${COLUMN} pb-8 md:pb-12`}>
        <button
          type="button"
          onClick={onStart}
          className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover md:min-h-[5.5rem] md:text-2xl"
        >
          {t('welcome.start')}
        </button>

        <p className="mt-6 text-center text-[0.6875rem] leading-relaxed text-faint md:text-xs">
          {t('welcome.footer')}
        </p>
      </footer>
    </Screen>
  )
}

function Divider({ parts }) {
  return (
    /* Phones stack: one hairline with the label beneath it, so the label gets
       the full column width and stays on a single line. Tablets and up get the
       classic flanked treatment. */
    <div className="my-9 flex flex-col items-stretch gap-4 md:my-12 md:flex-row md:items-center md:gap-5">
      <span className="h-px min-w-5 bg-hairline md:flex-1" />

      <span className="flex flex-wrap items-center justify-center gap-x-1.5 text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:gap-x-2 md:text-[0.6875rem] md:tracking-[0.22em]">
        {parts.map((part, i) => (
          <Fragment key={part}>
            {i > 0 && <span aria-hidden="true">·</span>}
            <span className="whitespace-nowrap">{part}</span>
          </Fragment>
        ))}
      </span>

      <span className="hidden h-px min-w-5 bg-hairline md:block md:flex-1" />
    </div>
  )
}

function LungMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className="mx-auto h-11 w-11 text-muted md:h-14 md:w-14"
      role="img"
      aria-label="Saans"
    >
      <path d="M32 12v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M32 22c-3.5-4-9-4.5-12.5-1.5C15 24.5 13 32 13.5 40.5c.3 5 2.5 8.5 6.5 9 4.5.6 8-2.5 9.5-7.5 1-3.5 1.5-7.5 1.5-11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 22c3.5-4 9-4.5 12.5-1.5C49 24.5 51 32 50.5 40.5c-.3 5-2.5 8.5-6.5 9-4.5.6-8-2.5-9.5-7.5-1-3.5-1.5-7.5-1.5-11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
