import { useEffect, useRef, useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import BackLink from '../components/BackLink.jsx'
import { useI18n } from '../i18n/index.jsx'
import { describeFetchError, isConnectionError } from '../lib/network.js'
import { useCollectionEnabled } from '../lib/collection.js'
import ConsentToggle from '../components/ConsentToggle.jsx'

/**
 * Camera capture with an upload fallback. Many field devices have no usable
 * rear camera (or deny permission), so the upload path is always offered
 * rather than being a hidden last resort.
 */
export default function XrayScanScreen({
  ageYears,
  onAnalyzed,
  onBack,
}) {
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraState, setCameraState] = useState('starting') // starting | live | unavailable
  const [capture, setCapture] = useState(null) // { dataUrl, blob }
  const [status, setStatus] = useState('idle') // idle | analyzing | error
  const [error, setError] = useState(null)
  const collecting = useCollectionEnabled()
  const [consent, setConsent] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unavailable')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCameraState('live')
      } catch {
        if (!cancelled) setCameraState('unavailable')
      }
    }

    startCamera()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function captureFrame() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setCapture({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), blob })
        stopCamera()
        setCameraState('unavailable')
      },
      'image/jpeg',
      0.92
    )
  }

  function onFilePicked(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCapture({ dataUrl: String(reader.result), blob: file })
    reader.readAsDataURL(file)
    stopCamera()
  }

  async function analyze() {
    if (!capture) return
    setStatus('analyzing')
    setError(null)

    const body = new FormData()
    body.append('image', capture.blob, 'xray.jpg')
    // The film is kept only if the carer agreed to this one.
    body.append('consent', consent ? 'true' : 'false')
    if (ageYears != null) body.append('age_years', String(ageYears))

    try {
      const response = await fetch('/api/vision/xray', { method: 'POST', body })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`${response.status} ${detail.slice(0, 120)}`)
      }
      const analysis = await response.json()
      onAnalyzed({ analysis, capturedDataUrl: capture.dataUrl })
    } catch (err) {
      setStatus('error')
      // A connection failure gets its own message: "check the vision service"
      // is the wrong advice when the problem is that there is no network.
      setError(
        isConnectionError(err)
          ? describeFetchError(err, t)
          : t('xrayScan.failed', { error: String(err.message || err) }),
      )
    }
  }

  return (
    <Screen fill>
      <TopBar />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        <BackLink onClick={onBack} />

        <h1 className="mt-6 text-[1.5rem] leading-snug font-medium text-balance text-fg md:text-[2rem] md:leading-[1.3]">
          {t('xrayScan.title')}
        </h1>

        <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
          <div className="relative aspect-[4/3] w-full bg-canvas">
            {capture ? (
              <img
                src={capture.dataUrl}
alt={t('xrayScan.capturedAlt')}
                className="h-full w-full object-contain"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                {/* Framing guide */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/25"
                />
                {cameraState !== 'live' && (
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                    <p className="text-sm leading-relaxed text-muted md:text-base">
                      {cameraState === 'starting'
                        ? t('xrayScan.startingCamera')
                        : t('xrayScan.cameraUnavailable')}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="border-t border-hairline px-5 py-4 text-sm leading-relaxed text-muted md:text-base">
            {t('xrayScan.guidance')}
          </p>
        </div>

        {/* Asked while the film is on screen and before it is sent, which is
            the only moment the answer means anything. */}
        {collecting && capture && (
          <div className="mt-4">
            <ConsentToggle checked={consent} onChange={setConsent} />
          </div>
        )}

        {status === 'error' && (
          <p
            aria-live="polite"
            className="mt-4 rounded-xl border border-danger px-4 py-3 text-sm leading-relaxed text-fg md:text-base"
          >
            {error}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFilePicked}
          className="sr-only"
aria-label={t('xrayScan.uploadAria')}
        />
      </main>

      <footer className={`${COLUMN} flex flex-col gap-3 pt-4 pb-8 md:gap-4 md:pb-12`}>
        {capture ? (
          <>
            <PrimaryButton onClick={analyze} disabled={status === 'analyzing'}>
              {status === 'analyzing'
                ? t('xrayScan.analyzing')
                : t('xrayScan.analyze')}
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setCapture(null)
                setStatus('idle')
              }}
            >
              {t('xrayScan.retake')}
            </SecondaryButton>
          </>
        ) : (
          <>
            <PrimaryButton onClick={captureFrame} disabled={cameraState !== 'live'}>
              {t('xrayScan.capture')}
            </PrimaryButton>
            <SecondaryButton onClick={() => fileInputRef.current?.click()}>
              {t('xrayScan.upload')}
            </SecondaryButton>
          </>
        )}
      </footer>
    </Screen>
  )
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover disabled:cursor-not-allowed disabled:bg-surface disabled:text-faint md:min-h-[5.5rem] md:text-2xl"
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[4rem] w-full items-center justify-center rounded-xl border border-hairline bg-surface px-8 text-base font-semibold text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[4.5rem] md:text-lg"
    >
      {children}
    </button>
  )
}
