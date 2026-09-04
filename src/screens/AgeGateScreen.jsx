import { useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import { useI18n } from '../i18n/index.jsx'
import BackLink from '../components/BackLink.jsx'

const MAX_ENTRY = 17

export default function AgeGateScreen({ onSubmit, onBack }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')

  const years = value === '' ? null : Number(value)
  const isValid =
    years !== null && Number.isInteger(years) && years >= 0 && years <= MAX_ENTRY

  function submit(event) {
    event.preventDefault()
    if (isValid) onSubmit(years)
  }

  return (
    <Screen>
      <TopBar />

      <form onSubmit={submit} className="flex flex-1 flex-col">
        <main className={`${COLUMN} flex flex-1 flex-col pt-6 md:pt-10`}>
          <BackLink onClick={onBack} />

          <div className="flex flex-1 flex-col justify-center py-8">
            <label
              htmlFor="age"
              className="text-[1.75rem] leading-snug font-medium text-balance text-fg md:text-[2.5rem] md:leading-[1.25]"
            >
              {t('ageGate.question')}
            </label>

            <div className="mt-8 flex items-center gap-4 md:mt-10">
              <input
                id="age"
                type="text"
                dir="ltr"
                inputMode="numeric"
                autoComplete="off"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                aria-describedby="age-hint"
                className="font-display w-full min-w-0 rounded-xl border border-hairline bg-surface px-6 py-5 text-center text-5xl font-semibold text-fg transition-colors duration-150 outline-none placeholder:text-faint focus:border-teal focus-visible:ring-2 focus-visible:ring-teal md:py-6 md:text-6xl"
              />
              <span className="text-xl text-muted md:text-2xl">{t('ageGate.unit')}</span>
            </div>

            <p
              id="age-hint"
              className="mt-4 text-sm leading-relaxed text-faint md:text-base"
            >
              {t('ageGate.hint')}
            </p>
          </div>
        </main>

        <footer className={`${COLUMN} pb-8 md:pb-12`}>
          <button
            type="submit"
            disabled={!isValid}
            className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover disabled:cursor-not-allowed disabled:bg-surface disabled:text-faint md:min-h-[5.5rem] md:text-2xl"
          >
            {t('common.continue')}
          </button>
        </footer>
      </form>
    </Screen>
  )
}
