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
