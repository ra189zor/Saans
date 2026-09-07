/**
 * Turning a failed request into something a health worker can act on.
 *
 * Three screens in Saans talk to a server: chest X-ray, cough, and the
 * handbook assistant. Everything else — the danger signs, the symptom
 * questions, Sum A and Sum B, the result — is computed on the device and
 * keeps working with no network at all.
 *
 * So when a request fails, the useful message is not a status code. It is
 * which of those two situations the worker is in, and what still works.
 */

/**
 * True when fetch never reached the server.
 *
 * fetch() rejects with a TypeError for every failure below the HTTP layer —
 * no network, DNS failure, connection refused, request blocked. An HTTP error
 * response is not one of these: it resolves, and the screens throw their own
 * Error for it, which is why those still surface their real detail.
 */
export function isConnectionError(error) {
  return error instanceof TypeError || error?.name === 'TypeError'
}

/**
 * A message for a failed request, or the original detail if the server did
 * answer and the failure was something else.
 */
export function describeFetchError(error, t) {
  if (!isConnectionError(error)) return String(error?.message || error)
  return navigator.onLine ? t('common.serverUnreachable') : t('common.offline')
}

/**
 * What the server said went wrong, in full.
 *
 * FastAPI puts the reason in `detail`, and both capture screens used to show
 * the raw body cut to 120 characters — of which `{"detail":"Could not analyze
 * image: ` was already 36. A real Keras load failure was truncated to nothing
 * useful, which turned a one-line diagnosis into an afternoon. Validation
 * errors arrive as a list rather than a string, so those are stringified
 * rather than dropped.
 */
export async function readErrorDetail(response) {
  let body = ''
  try {
    body = await response.text()
  } catch {
    /* no body to read */
  }

  let detail = body
  try {
    const parsed = JSON.parse(body)
    if (parsed?.detail !== undefined) {
      detail =
        typeof parsed.detail === 'string'
          ? parsed.detail
          : JSON.stringify(parsed.detail)
    }
  } catch {
    /* not JSON; the raw body is the best available */
  }

  return detail ? `${response.status} ${detail}` : String(response.status)
}
