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

export const SOURCE_NOTE =
  'Scores per WHO Operational Handbook on Tuberculosis, Module 5 (2022), Annex 5.'

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

export const CONTACT_RULE = 'Initiate appropriate TB treatment immediately.'

export const MWRD_RULE = 'Initiate appropriate TB treatment immediately.'
export const MWRD_NOTIFY = 'Register and notify to the NTP.'

export const DECISION_TREAT = 'Initiate appropriate TB treatment.'
export const DECISION_NO_TREAT =
  'Do not treat with TB treatment. Follow-up in 1–2 weeks.'

export const LOWER_RISK_GUIDANCE =
  'Treat most likely non-TB condition(s). Follow-up in 1–2 weeks. Continue screening only if symptoms persist or worsen.'

/** The nine scored symptom items, in published order. */
export const SYMPTOM_ITEMS = [
  { id: 'cough', label: 'Cough longer than 2 weeks', a: 2, b: 5 },
  { id: 'fever', label: 'Fever longer than 2 weeks', a: 5, b: 10 },
  { id: 'lethargy', label: 'Lethargy', a: 3, b: 4 },
  { id: 'weightLoss', label: 'Weight loss / failure to thrive', a: 3, b: 5 },
  { id: 'haemoptysis', label: 'Haemoptysis', a: 4, b: 9 },
  { id: 'nightSweats', label: 'Night sweats', a: 2, b: 6 },
  {
    id: 'lymphNodes',
    label: 'Swollen lymph nodes (cervical, submandibular or axillary)',
    a: 4,
    b: 7,
  },
  { id: 'tachycardia', label: 'Tachycardia', a: 2, b: 4 },
  /* Tachypnoea is the one negative weight in Algorithm A. */
  { id: 'tachypnoea', label: 'Tachypnoea', a: -1, b: 2 },
]

/** Chest X-ray features — Algorithm A only (Sum B). */
export const CXR_ITEMS = [
  { id: 'cavity', label: 'Cavity', points: 6 },
  { id: 'enlargedLymphNodes', label: 'Enlarged lymph nodes', points: 17 },
  { id: 'opacities', label: 'Opacities', points: 5 },
  { id: 'miliary', label: 'Miliary pattern', points: 15 },
  { id: 'effusion', label: 'Effusion', points: 8 },
]

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
    let label = item.label
    if (item.id === 'cough' && findings.coughDays != null) {
      label = `${item.label} (${findings.coughDays} days)`
    }
    if (item.id === 'fever' && findings.feverDays != null) {
      label = `${item.label} (${findings.feverDays} days)`
    }
    items.push({ id: item.id, label, points, group: 'symptom' })
  }

  const cxrItems = []
  if (useA && cxr) {
    for (const item of CXR_ITEMS) {
      if (!cxr[item.id]) continue
      cxrItems.push({
        id: item.id,
        label: item.label,
        points: item.points,
        group: 'cxr',
      })
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
