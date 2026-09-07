import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/index.jsx'

/**
 * "Install Saans" — the affordance Chrome does not give you.
 *
 * Chrome stopped showing an install banner years ago. On desktop it puts a
 * small icon in the address bar; on Android it hides "Install app" in the
 * three-dot menu. A health worker will not find either, so the app has to ask.
 *
 * The mechanism is `beforeinstallprompt`: Chrome fires it when the app meets
 * the install criteria, preventDefault() suppresses its own mini-infobar, and
 * the saved event can be replayed later — but only from a real user gesture,
 * and only once. After that Chrome discards it, so the button hides itself.
 *
 * It renders nothing at all unless the event has fired, which is the honest
 * behaviour: already installed, no service worker, plain http, or a browser
 * that does not support installing, and there is nothing to offer.
 *
 * iOS is the exception worth handling. Safari never fires the event and has no
 * API for this; installing means Share -> Add to Home Screen, done by hand. So
 * iOS gets a sentence instead of a button.
 */
export default function InstallButton() {
  const { t } = useI18n()
  const [prompt, setPrompt] = useState(null)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    function onBeforeInstall(event) {
      // Stops Chrome's own mini-infobar so there is one prompt, not two.
      event.preventDefault()
      setPrompt(event)
    }
    function onInstalled() {
      setPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    // Safari on iPhone or iPad, and not already launched from the home screen.
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    setIosHint(ios && !standalone)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    // Spent either way: Chrome will not let the same event be shown twice.
    setPrompt(null)
  }

  if (prompt) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex min-h-[3.5rem] w-full items-center justify-center gap-3 rounded-xl border border-hairline bg-surface px-6 text-base font-semibold text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:min-h-[4rem] md:text-lg"
      >
        <DownloadIcon />
        {t('install.action')}
      </button>
    )
  }

  if (iosHint) {
    return (
      <p className="text-center text-xs leading-relaxed text-faint md:text-sm">
        {t('install.iosHint')}
      </p>
    )
  }

  return null
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0 text-teal"
      aria-hidden="true"
    >
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </svg>
  )
}
