/**
 * WHO IMCI danger signs, asked one at a time during triage.
 *
 * `triggerOn` is the answer that fires the sign — note Q1 is inverted:
 * a child who CANNOT drink or breastfeed is the emergency.
 *
 * All are always asked; `outcome` classifies the collected set afterwards:
 *   'urgent'    → red emergency screen
 *   'breathing' → amber severity check, which may still de-escalate
 *
 * Question text and the short summary label live in `src/i18n` under
 * `dangerSigns.<id>.text` / `dangerSigns.<id>.label`.
 */
export const DANGER_SIGNS = [
  { id: 'drink', triggerOn: 'no', outcome: 'urgent' },
  { id: 'vomit', triggerOn: 'yes', outcome: 'urgent' },
  { id: 'seizure', triggerOn: 'yes', outcome: 'urgent' },
  { id: 'consciousness', triggerOn: 'yes', outcome: 'urgent' },
  { id: 'indrawing', triggerOn: 'yes', outcome: 'breathing' },
  { id: 'stridor', triggerOn: 'yes', outcome: 'urgent' },
  { id: 'dehydration', triggerOn: 'yes', outcome: 'urgent' },
  { id: 'pallor', triggerOn: 'yes', outcome: 'urgent' },
  { id: 'hypoxia', triggerOn: 'yes', outcome: 'urgent' },
  { id: 'neckStiffness', triggerOn: 'yes', outcome: 'urgent' },
]

/** Screening is validated for children below this age, in completed years. */
export const MAX_AGE_YEARS = 5
