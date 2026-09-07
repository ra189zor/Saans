import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { guideImages } from '../data/guides.js'
import { useI18n } from '../i18n/index.jsx'

/**
 * The visual example attached to a question — the picture of what the sign
 * looks like on a real child.
 *
 * Two ways in, one viewer:
 *
 *   <GuideImage key="stridor" />   a preview under the question, for screens
 *                                  that show one question at a time
 *   <GuideLink  key="muac" />      a single line, for screens already dense
 *                                  with controls
 *
 * The preview exists to be recognised, not read: these are detailed charts and
 * their small print is illegible at phone width. Opening the viewer is what
 * makes them useful, so both entry points lead there and the viewer can zoom
 * past the width of the screen.
 *
 * No brightness or contrast filter is applied at any size. Half of these
 * pictures are colour judgements — a pale palm, blue lips, the red band on a
 * MUAC tape — and shading them to sit more comfortably in a dark UI would
 * change the thing the worker is being asked to compare against.
 */

function altFor(image, t) {
  return t(`guide.alt.${image.alt}`)
}

/** A preview under the question. Tapping it opens the full guide. */
export function GuideImage({ guideKey }) {
  const { lang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const images = guideImages(guideKey, lang)
  if (!images) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full overflow-hidden rounded-xl border border-hairline bg-surface text-start transition-colors duration-150 outline-none select-none hover:border-teal focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        <img
          src={images[0].src}
          alt={altFor(images[0], t)}
          loading="lazy"
          decoding="async"
          className="block w-full"
        />
        <span className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3 md:px-5">
          <span className="text-[0.5625rem] font-medium tracking-[0.16em] text-muted uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
            {t('guide.howToCheck')}
          </span>
          <ExpandIcon className="h-4 w-4 shrink-0 text-faint transition-colors duration-150 group-hover:text-teal md:h-[1.125rem] md:w-[1.125rem]" />
        </span>
      </button>

      {open && (
        <GuideViewer images={images} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

/** One line, for screens with no room for a preview. */
export function GuideLink({ guideKey }) {
  const { lang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const images = guideImages(guideKey, lang)
  if (!images) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md px-1 py-2 text-sm font-medium text-muted transition-colors duration-150 outline-none select-none hover:text-teal focus-visible:ring-2 focus-visible:ring-teal md:text-base"
      >
        <ExpandIcon className="h-4 w-4 shrink-0" />
        {t('guide.howToCheck')}
      </button>

      {open && (
        <GuideViewer images={images} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function GuideViewer({ images, onClose }) {
  const { t } = useI18n()
  const [zoomed, setZoomed] = useState(false)
  const closeRef = useRef(null)
  const returnFocusRef = useRef(null)

  useEffect(() => {
    returnFocusRef.current = document.activeElement
    closeRef.current?.focus()

    // The page behind must not scroll while the guide is over it.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
      returnFocusRef.current?.focus?.()
    }
  }, [onClose])

  /* Portalled to <body>. The triage question sits inside an element with a
     transform animation, and a transformed ancestor becomes the containing
     block for fixed positioning — inline, the overlay covered only that box
     instead of the screen. */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('guide.howToCheck')}
      className="fixed inset-0 z-50 flex flex-col bg-canvas"
      /* Portalled out of <Screen>, so it carries its own safe areas or the
         close button ends up under the notch. */
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-5 py-4 md:px-8 md:py-5">
        <p className="text-[0.5625rem] font-medium tracking-[0.16em] text-muted uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
          {t('guide.howToCheck')}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="-me-2 flex min-h-[2.75rem] items-center gap-2 rounded-md px-2 text-sm font-medium text-muted transition-colors duration-150 outline-none select-none hover:text-fg focus-visible:ring-2 focus-visible:ring-teal md:text-base"
        >
          {t('guide.close')}
          <CloseIcon className="h-4 w-4 shrink-0 md:h-[1.125rem] md:w-[1.125rem]" />
        </button>
      </header>

      {/* Both axes scroll: zoomed in, the picture is wider than the screen. */}
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-5 py-5 md:px-8 md:py-7">
        {/* min-h-full centres a single picture in the space available and
            still scrolls from the top once two of them outgrow it. */}
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-5 md:gap-7">
          {images.map((image) => (
            <img
              key={image.src}
              src={image.src}
              alt={altFor(image, t)}
              onClick={() => setZoomed((z) => !z)}
              className={`block rounded-xl ${
                zoomed ? 'w-[250%] max-w-none cursor-zoom-out' : 'w-full cursor-zoom-in'
              }`}
            />
          ))}
        </div>
      </div>

      <footer className="shrink-0 border-t border-hairline px-5 py-4 md:px-8">
        <p className="mx-auto max-w-3xl text-xs leading-relaxed text-faint md:text-sm">
          {zoomed ? t('guide.fitHint') : t('guide.zoomHint')}
        </p>
      </footer>
    </div>,
    document.body,
  )
}

function ExpandIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
