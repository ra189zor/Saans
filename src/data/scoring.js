/**
 * WHO Algorithm B scoring — fully deterministic, no model involved.
 * Only positive findings score; each contributes its points once.
 */

export const DURATION_THRESHOLD_DAYS = 14
export const PRESUMPTIVE_THRESHOLD = 10
export const MAX_DURATION_DAYS = 30

export function scoreSymptoms({
  coughDays = 0,
  feverDays = 0,
  weightLoss = false,
  lymphNodes = false,
  householdTb = false,
  fastBreathing = false,
} = {}) {
  const items = []

  if (coughDays >= DURATION_THRESHOLD_DAYS) {
    items.push({ id: 'cough', label: `Cough ${coughDays} days`, points: 5 })
  }
  if (feverDays >= DURATION_THRESHOLD_DAYS) {
    items.push({ id: 'fever', label: `Fever ${feverDays} days`, points: 3 })
  }
  if (weightLoss) {
    items.push({
      id: 'weightLoss',
      label: 'Weight loss or poor weight gain',
      points: 5,
    })
  }
  if (lymphNodes) {
    items.push({
      id: 'lymphNodes',
      label: 'Swollen or matted lymph nodes',
      points: 7,
    })
  }
  if (householdTb) {
    items.push({
      id: 'householdTb',
      label: 'Household TB contact in last 12 months',
      points: 4,
    })
  }
  if (fastBreathing) {
    items.push({
      id: 'fastBreathing',
      label: 'Fast or difficult breathing',
      points: 2,
    })
  }

  return {
    total: items.reduce((sum, item) => sum + item.points, 0),
    items,
  }
}

/** Cosmetic referral identifier for the demo — not backed by any registry. */
export function makeReferralCode() {
  return `SAANS-PHC-${Math.floor(100 + Math.random() * 900)}`
}
