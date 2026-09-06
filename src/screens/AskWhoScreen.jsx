import { useEffect, useRef, useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import BackLink from '../components/BackLink.jsx'
import { useI18n } from '../i18n/index.jsx'
import { describeFetchError } from '../lib/network.js'

const SUGGESTIONS = ['startTreatment', 'fourMonth', 'malnutrition']

/**
 * Ask WHO Assistant — questions answered only from the WHO handbook.
 *
 * This is the one screen in Saans that needs the internet: retrieval runs
 * locally but the answer is written by a hosted model. The status check on
 * mount lets the screen say so plainly rather than failing on the first
 * question, and every other part of the app keeps working without it.
 *
 * Answers are a reference lookup. They never touch the screening score.
 */
export default function AskWhoScreen({ onBack }) {
  const { t } = useI18n()

  const [status, setStatus] = useState(null) // null = checking
  const [messages, setMessages] = useState([]) // { role, text, sources?, refused? }
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/assistant/status')
      .then((r) => r.json())
      .then((s) => !cancelled && setStatus(s))
      .catch(
        () =>
          !cancelled &&
          setStatus({
            available: false,
            unreachable: true,
            offline: !navigator.onLine,
          }),
      )
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  async function ask(question) {
    const text = (question ?? draft).trim()
    if (!text || pending) return

    setMessages((prev) => [...prev, { role: 'worker', text }])
    setDraft('')
    setPending(true)

    try {
      const response = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || `${response.status}`)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          sources: data.sources ?? [],
          refused: data.refused,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', text: describeFetchError(err, t) },
      ])
    } finally {
      setPending(false)
    }
  }

  const blocked = status && !status.available
  const empty = messages.length === 0

  return (
    <Screen fill>
      <TopBar />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        <BackLink onClick={onBack} />

        <h1 className="mt-6 text-[1.5rem] leading-snug font-medium text-balance text-fg md:text-[2rem] md:leading-[1.3]">
          {t('assistant.title')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-faint md:text-base">
          {t('assistant.subtitle')}
        </p>

        {blocked && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-amber bg-surface p-5 md:p-6"
          >
            <p className="text-sm leading-relaxed text-fg md:text-base">
              {status.offline
                ? t('common.offline')
                : status.unreachable
                  ? t('assistant.serverDown')
                  : !status.index_ready
                    ? t('assistant.noIndex')
                    : t('assistant.noKey')}
            </p>
          </div>
        )}

        {empty && !blocked && (
          <section className="mt-8">
            <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
              {t('assistant.tryAsking')}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {SUGGESTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => ask(t(`assistant.suggestions.${key}`))}
                  className="flex min-h-[3.5rem] w-full items-center rounded-xl border border-hairline bg-surface px-5 py-3 text-start text-sm leading-snug font-medium text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-h-[4rem] md:px-6 md:text-base"
                >
                  {t(`assistant.suggestions.${key}`)}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-col gap-4">
          {messages.map((message, i) => (
            <Message key={i} message={message} t={t} />
          ))}
          {pending && (
            <p aria-live="polite" className="text-sm text-muted md:text-base">
              {t('assistant.thinking')}
            </p>
          )}
          <div ref={endRef} />
        </div>

        {!empty && (
          <p className="mt-8 border-t border-hairline pt-5 text-xs leading-relaxed text-faint md:text-sm">
            {t('assistant.disclaimer')}
          </p>
        )}
      </main>

      <footer className={`${COLUMN} pt-4 pb-8 md:pb-12`}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask()
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('assistant.placeholder')}
            aria-label={t('assistant.placeholder')}
            disabled={blocked || pending}
            maxLength={500}
            className="min-h-[4rem] w-full min-w-0 rounded-xl border border-hairline bg-surface px-5 text-base text-fg outline-none placeholder:text-faint focus:border-teal focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50 md:min-h-[4.5rem] md:text-lg"
          />
          <button
            type="submit"
            disabled={blocked || pending || !draft.trim()}
            className="flex min-h-[4rem] shrink-0 items-center justify-center rounded-xl bg-teal px-6 text-base font-bold text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:bg-surface disabled:text-faint md:min-h-[4.5rem] md:px-8 md:text-lg"
          >
            {t('assistant.send')}
          </button>
        </form>
      </footer>
    </Screen>
  )
}

function Message({ message, t }) {
  if (message.role === 'worker') {
    return (
      <div className="self-end rounded-xl bg-teal px-5 py-3 text-base text-white md:text-lg">
        {message.text}
      </div>
    )
  }

  if (message.role === 'error') {
    return (
      <div role="alert" className="rounded-xl border border-danger bg-surface px-5 py-4">
        <p className="text-sm leading-relaxed text-danger md:text-base">{message.text}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface px-5 py-4 md:px-6">
      <p className="text-base leading-relaxed text-fg md:text-lg">{message.text}</p>

      {/* Sources are the point, not a footnote: the health worker can open the
          handbook at that page and check the answer against the source. */}
      {message.sources?.length > 0 && (
        <div className="mt-4 border-t border-hairline pt-3">
          <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
            {t('assistant.sourceLabel')}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {message.sources.map((s, i) => (
              <li key={i} className="text-xs leading-relaxed text-muted md:text-sm">
                {t('assistant.page', { page: s.page })}
                {s.section ? ` · ${s.section}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
