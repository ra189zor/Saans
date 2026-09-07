import { useEffect, useRef, useState } from 'react'
import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'
import BackLink from '../components/BackLink.jsx'
import { useI18n } from '../i18n/index.jsx'
import { describeFetchError } from '../lib/network.js'
import { useCollectionEnabled } from '../lib/collection.js'
import ConsentToggle from '../components/ConsentToggle.jsx'

const RECORD_SECONDS = 10
const TARGET_SAMPLE_RATE = 16000

/**
 * Records ten seconds of the child's cough and sends it for acoustic analysis.
 *
 * The clip is decoded and resampled to 16 kHz mono here, then written as a
 * 16-bit PCM WAV, so the server can read it with the Python standard library
 * and needs no audio codec installed. It also keeps the upload near 320 KB,
 * which matters on a clinic connection.
 *
 * The result is a hint for the health worker. It carries no weight in the WHO
 * score, which is what the caption on the result says.
 */
/**
 * `lastStep` is set when this screen is the final step before the result —
 * which is how it is reached from the chest X-ray. It changes the closing
 * button from "back to symptoms" to "see result", and offers a skip, because
 * a tablet with no microphone or a refused permission must not be able to
 * trap the worker one step short of the score.
 */
export default function CoughRecordScreen({
  ageYears,
  onDone,
  onBack,
  onSkip,
  lastStep = false,
}) {
  const { t } = useI18n()

  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const [phase, setPhase] = useState('idle') // idle | recording | recorded | analyzing | done | error
  const [remaining, setRemaining] = useState(RECORD_SECONDS)
  const [recording, setRecording] = useState(null) // { wavBlob, url }
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const collecting = useCollectionEnabled()
  const [consent, setConsent] = useState(false)

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (recording?.url) URL.revokeObjectURL(recording.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Interleaved float PCM -> 16-bit mono WAV, written by hand to avoid a dependency. */
  function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)
    const writeText = (offset, text) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
    }

    writeText(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeText(8, 'WAVEfmt ')
    view.setUint32(16, 16, true) // PCM header size
    view.setUint16(20, 1, true) // format: PCM
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true) // byte rate
    view.setUint16(32, 2, true) // block align
    view.setUint16(34, 16, true) // bits per sample
    writeText(36, 'data')
    view.setUint32(40, samples.length * 2, true)

    for (let i = 0; i < samples.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    }
    return new Blob([view], { type: 'audio/wav' })
  }

  async function toWav(blob) {
    const bytes = await blob.arrayBuffer()
    const decodeContext = new (window.AudioContext || window.webkitAudioContext)()
    const decoded = await decodeContext.decodeAudioData(bytes)
    decodeContext.close()

    /* Resample to 16 kHz mono offline: the analyser works at that rate, and
       doing it here keeps the upload small. */
    const frames = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE)
    const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE)
  }

  async function startRecording() {
    setError(null)
    setResult(null)
    if (recording?.url) URL.revokeObjectURL(recording.url)
    setRecording(null)

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setPhase('error')
      setError(t('coughRecord.unsupported'))
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        try {
          const wavBlob = await toWav(new Blob(chunksRef.current, { type: recorder.mimeType }))
          setRecording({ wavBlob, url: URL.createObjectURL(wavBlob) })
          setPhase('recorded')
        } catch (err) {
          setPhase('error')
          setError(String(err.message || err))
        }
      }

      recorder.start()
      setPhase('recording')
      setRemaining(RECORD_SECONDS)

      timerRef.current = setInterval(() => {
        setRemaining((left) => {
          if (left <= 1) {
            clearInterval(timerRef.current)
            if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
            return 0
          }
          return left - 1
        })
      }, 1000)
    } catch {
      setPhase('error')
      setError(t('coughRecord.permissionDenied'))
    }
  }

  function stopEarly() {
    clearInterval(timerRef.current)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  async function analyze() {
    if (!recording) return
    setPhase('analyzing')
    setError(null)

    const body = new FormData()
    body.append('audio', recording.wavBlob, 'cough.wav')
    // Kept only if the carer agreed to this recording.
    body.append('consent', consent ? 'true' : 'false')
    if (ageYears != null) body.append('age_years', String(ageYears))

    try {
      const response = await fetch('/api/audio/cough', { method: 'POST', body })
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`${response.status} ${detail.slice(0, 120)}`)
      }
      setResult(await response.json())
      setPhase('done')
    } catch (err) {
      setPhase('error')
      setError(describeFetchError(err, t))
    }
  }

  const elapsed = RECORD_SECONDS - remaining

  return (
    <Screen fill>
      <TopBar />

      <main className={`${COLUMN} min-h-0 flex-1 overflow-y-auto py-6 md:py-10`}>
        <BackLink onClick={onBack} />

        <h1 className="mt-6 text-[1.5rem] leading-snug font-medium text-balance text-fg md:text-[2rem] md:leading-[1.3]">
          {t('coughRecord.title')}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-faint md:text-base">
          {t('coughRecord.guidance')}
        </p>

        {phase === 'recording' && (
          <section className="mt-8 flex flex-col items-center" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-danger" aria-hidden="true" />
              <span className="text-[0.5625rem] font-medium tracking-[0.16em] text-danger uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
                {t('coughRecord.recording')}
              </span>
            </div>
            <p className="font-display mt-4 text-6xl font-semibold text-fg tabular-nums md:text-7xl">
              {remaining}
            </p>
            <div
              className="mt-5 h-1 w-full overflow-hidden bg-hairline"
              role="progressbar"
              aria-valuenow={elapsed}
              aria-valuemin={0}
              aria-valuemax={RECORD_SECONDS}
            >
              <div
                className="h-full bg-teal transition-[width] duration-1000 ease-linear"
                style={{ width: `${(elapsed / RECORD_SECONDS) * 100}%` }}
              />
            </div>
          </section>
        )}

        {phase === 'recorded' && recording && (
          <section className="mt-8">
            <audio src={recording.url} controls className="w-full" />

            {/* Asked once the recording exists and can be played back, so the
                carer is agreeing to something they have actually heard. */}
            {collecting && (
              <div className="mt-4">
                <ConsentToggle checked={consent} onChange={setConsent} />
              </div>
            )}
          </section>
        )}

        {phase === 'analyzing' && (
          <p aria-live="polite" className="mt-8 text-base text-muted md:text-lg">
            {t('coughRecord.analyzing')}
          </p>
        )}

        {phase === 'done' && result && <CoughResult result={result} t={t} />}

        {error && (
          <p role="alert" className="mt-6 text-sm leading-relaxed text-danger md:text-base">
            {error}
          </p>
        )}
      </main>

      <footer className={`${COLUMN} pt-4 pb-8 md:pb-12`}>
        {(phase === 'idle' || phase === 'error') && (
          <div className="flex flex-col gap-3 md:gap-4">
            <PrimaryButton onClick={startRecording}>{t('coughRecord.start')}</PrimaryButton>
            {lastStep && onSkip && (
              <SecondaryButton onClick={onSkip}>{t('coughRecord.skip')}</SecondaryButton>
            )}
          </div>
        )}

        {phase === 'recording' && (
          <SecondaryButton onClick={stopEarly}>{t('coughRecord.stop')}</SecondaryButton>
        )}

        {phase === 'recorded' && (
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <SecondaryButton onClick={startRecording}>{t('coughRecord.reRecord')}</SecondaryButton>
            <PrimaryButton onClick={analyze}>{t('coughRecord.use')}</PrimaryButton>
          </div>
        )}

        {phase === 'done' && (
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <SecondaryButton onClick={startRecording}>{t('coughRecord.reRecord')}</SecondaryButton>
            <PrimaryButton onClick={() => onDone(result)}>
              {t(lastStep ? 'coughRecord.seeResult' : 'coughRecord.back')}
            </PrimaryButton>
          </div>
        )}
      </footer>
    </Screen>
  )
}

function CoughResult({ result, t }) {
  const pattern = result.cough_pattern
  const patternKey =
    pattern === 'wet' ? 'wet' : pattern === 'dry' ? 'dry' : 'none'

  return (
    <section className="mt-8">
      <div className="rounded-xl border border-hairline bg-surface p-5 md:p-6">
        <Row
          label={t('coughRecord.patternLabel')}
          value={t(`coughRecord.pattern.${patternKey}`)}
        />
        <div className="mt-4 border-t border-hairline pt-4">
          <Row
            label={t('coughRecord.characterLabel')}
            value={t(`coughRecord.character.${result.sound_character}`)}
          />
        </div>
        <div className="mt-4 border-t border-hairline pt-4">
          <Row
            label={t('coughRecord.coughsLabel')}
            value={String(result.coughs_detected)}
          />
        </div>
      </div>

      {/* The model does not decide anything. Say so on the screen, not only in
          the docs, because this is the screen the health worker is looking at. */}
      <div className="mt-4 rounded-xl border border-amber bg-surface p-5 md:p-6">
        <p className="text-sm leading-relaxed text-fg md:text-base">
          {t('coughRecord.disclaimer')}
        </p>
        {/* Always shown. Cough detection is a trained model and wet/dry is not,
            so the worker needs to know which half of the result to lean on. */}
        <p className="mt-3 text-xs leading-relaxed text-faint md:text-sm">
          {t('coughRecord.methodNote')}
        </p>
      </div>
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[0.5625rem] font-medium tracking-[0.16em] text-faint uppercase md:text-[0.6875rem] md:tracking-[0.2em]">
        {label}
      </span>
      <span className="font-display text-lg font-semibold text-fg md:text-xl">{value}</span>
    </div>
  )
}

function PrimaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl bg-teal px-8 text-xl font-bold tracking-tight text-white transition-colors duration-150 outline-none select-none hover:bg-teal-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-teal-hover md:min-h-[5.5rem] md:text-2xl"
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
      className="flex min-h-[4.75rem] w-full items-center justify-center rounded-xl border border-hairline bg-surface px-4 text-base font-semibold text-fg transition-colors duration-150 outline-none select-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:bg-surface-hover md:min-h-[5.5rem] md:text-lg"
    >
      {children}
    </button>
  )
}
