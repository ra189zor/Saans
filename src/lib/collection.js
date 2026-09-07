import { useEffect, useState } from 'react'

/**
 * Whether this deployment keeps captures, and the outcome that labels them.
 *
 * The consent question is only worth asking where the answer can be acted on,
 * so the switch is hidden unless the server was started with SAANS_COLLECT=1.
 * Asked once per load and cached: it cannot change while the app is open.
 */
let pending = null

export function collectionEnabled() {
  if (!pending) {
    pending = fetch('/api/health')
      .then((r) => r.json())
      .then((health) => Boolean(health?.collection?.enabled))
      .catch(() => false)          // unreachable server means no collection
  }
  return pending
}

export function useCollectionEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let alive = true
    collectionEnabled().then((value) => alive && setEnabled(value))
    return () => {
      alive = false
    }
  }, [])
  return enabled
}

/**
 * Attach the screening result to whatever was kept during this session.
 *
 * Captures happen before the score exists, so the label always arrives second.
 * Best effort by design: a failure here must never reach the health worker,
 * who has finished the consultation and is looking at the result.
 */
export function recordOutcome(samples, outcome) {
  if (!samples?.length) return
  fetch('/api/data/outcome', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ samples, outcome }),
  }).catch(() => {})
}
