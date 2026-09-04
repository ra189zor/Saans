/**
 * WHO Operational Handbook on Tuberculosis, Module 5 (2022), Annex 5 —
 * treatment decision algorithms for pulmonary TB in children under 10.
 *
 * Two published algorithms:
 *   B — default, no chest X-ray. Symptom scores only.
 *   A — used where chest X-ray is available. Sum A (symptoms) + Sum B (CXR).
 *
 * Both treat when the total is STRICTLY GREATER THAN 10.
 *
 * A close or household TB contact in the previous 12 months bypasses scoring
 * entirely and goes straight to treatment — see CONTACT_RULE below.
 */

/** Treat when total > this value. 10 exactly does NOT treat. */
export const TREATMENT_THRESHOLD = 10

/**
 * Cough and fever qualify at 14 days or more.
 *
 * Score tables say "longer than 2 weeks"; Box A5.3 defines the item as
 * "2 weeks or more". We follow A5.3 and the algorithm's sensitivity-first
 * design (85% sensitivity target).
 */
export const DURATION_THRESHOLD_DAYS = 14
export const MAX_DURATION_DAYS = 30

/** The nine scored symptom items, in published order. */
export const SYMPTOM_ITEMS = [
  { id: 'cough', a: 2, b: 5 },
  { id: 'fever', a: 5, b: 10 },
  { id: 'lethargy', a: 3, b: 4 },
  { id: 'weightLoss', a: 3, b: 5 },
  { id: 'haemoptysis', a: 4, b: 9 },
  { id: 'nightSweats', a: 2, b: 6 },
  { id: 'lymphNodes', a: 4, b: 7 },
  { id: 'tachycardia', a: 2, b: 4 },
  /* Tachypnoea is the one negative weight in Algorithm A. */
  { id: 'tachypnoea', a: -1, b: 2 },
]

/** Chest X-ray features — Algorithm A only (Sum B). */
export const CXR_ITEMS = [
  { id: 'cavity', points: 6 },
  { id: 'enlargedLymphNodes', points: 17 },
  { id: 'opacities', points: 5 },
  { id: 'miliary', points: 15 },
  { id: 'effusion', points: 8 },
]

/** Aliases the vision service may return for a CXR feature. */
const CXR_ALIASES = {
  cavity: 'cavity',
  cavities: 'cavity',
  'cavity/cavities': 'cavity',
  'enlarged lymph nodes': 'enlargedLymphNodes',
  'lymph nodes': 'enlargedLymphNodes',
  opacity: 'opacities',
  opacities: 'opacities',
  miliary: 'miliary',
  'miliary pattern': 'miliary',
  effusion: 'effusion',
  effusions: 'effusion',
}

/** Map a suggested feature string from the vision API onto a CXR_ITEMS id. */
export function cxrIdFromLabel(value) {
  const key = String(value ?? '').trim().toLowerCase()
  if (CXR_ALIASES[key]) return CXR_ALIASES[key]
  const match = CXR_ITEMS.find((item) => item.id.toLowerCase() === key)
  return match ? match.id : null
}

/** Cough/fever are durations; the other seven are booleans. */
export function deriveFindings({
  coughDays = 0,
  feverDays = 0,
  ...flags
} = {}) {
  return {
    ...flags,
    cough: coughDays >= DURATION_THRESHOLD_DAYS,
    fever: feverDays >= DURATION_THRESHOLD_DAYS,
    coughDays,
    feverDays,
  }
}

/**
 * Score a set of findings.
 *
 * @param findings  booleans keyed by SYMPTOM_ITEMS id (plus coughDays/feverDays
 *                  for display only)
 * @param algorithm 'A' or 'B'
 * @param cxr       booleans keyed by CXR_ITEMS id — Algorithm A only
 */
export function scoreFindings(findings = {}, { algorithm = 'B', cxr = null } = {}) {
  const useA = algorithm === 'A'
  const items = []

  for (const item of SYMPTOM_ITEMS) {
    if (!findings[item.id]) continue
    const points = useA ? item.a : item.b
    /* `days` lets the UI render "Cough longer than 2 weeks (21 days)" in the
       active language; the scorer itself stays language-free. */
    const days =
      item.id === 'cough'
        ? findings.coughDays
        : item.id === 'fever'
          ? findings.feverDays
          : null
    items.push({ id: item.id, points, group: 'symptom', days })
  }

  const cxrItems = []
  if (useA && cxr) {
    for (const item of CXR_ITEMS) {
      if (!cxr[item.id]) continue
      cxrItems.push({ id: item.id, points: item.points, group: 'cxr' })
    }
  }

  const sum = (list) => list.reduce((n, i) => n + i.points, 0)
  const symptomTotal = sum(items)
  const cxrTotal = sum(cxrItems)
  const total = symptomTotal + cxrTotal

  return {
    algorithm: useA ? 'A' : 'B',
    items: [...items, ...cxrItems],
    symptomTotal,
    cxrTotal,
    total,
    treat: total > TREATMENT_THRESHOLD,
  }
}

/**
 * Cosmetic referral identifier for the demo — a unique-looking code per
 * screening, not backed by any registry.
 *
 * In production this is replaced by the real referral / registration number
 * issued by the national TB programme’s system, so the code on the referral
 * slip resolves to an actual record the receiving PHC can look up.
 */
export function makeReferralCode() {
  return `SAANS-PHC-${Math.floor(100 + Math.random() * 900)}`
}
