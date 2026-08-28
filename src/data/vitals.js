/**
 * Age-banded vital-sign thresholds used to auto-suggest tachypnoea and
 * tachycardia. A rate STRICTLY ABOVE the threshold is abnormal.
 *
 * Age is captured in completed years, so the two infant bands (<2 months and
 * 2–12 months) both fall inside "age 0" and cannot be told apart. Age 0 uses
 * the 2–12 month thresholds, which are the LOWER of the two — for a newborn
 * that over-suggests rather than under-suggests, the safer direction for a
 * screening tool. The health worker can always override.
 */

const BANDS = [
  { maxYearsExclusive: 1, respiratory: 50, heart: 150, label: '2–12 months' },
  { maxYearsExclusive: 5, respiratory: 40, heart: 140, label: '1–5 years' },
  { maxYearsExclusive: Infinity, respiratory: 30, heart: 120, label: 'over 5 years' },
]

export function vitalThresholds(ageYears) {
  const age = Number.isFinite(ageYears) ? ageYears : 0
  return BANDS.find((band) => age < band.maxYearsExclusive) ?? BANDS.at(-1)
}

export function isTachypnoeic(rate, ageYears) {
  if (rate == null || rate === '') return null
  return Number(rate) > vitalThresholds(ageYears).respiratory
}

export function isTachycardic(rate, ageYears) {
  if (rate == null || rate === '') return null
  return Number(rate) > vitalThresholds(ageYears).heart
}
