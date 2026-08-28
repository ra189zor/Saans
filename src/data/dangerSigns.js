/**
 * WHO IMCI danger signs, asked one at a time during triage.
 *
 * `triggerOn` is the answer that fires the sign — note Q1 is inverted:
 * a child who CANNOT drink or breastfeed is the emergency.
 *
 * All six are always asked; `outcome` classifies the collected set afterwards:
 *   'urgent'    → red emergency screen
 *   'breathing' → amber severity check, which may still de-escalate
 *
 * `label` is the short form used in the detected-signs summary.
 */
export const DANGER_SIGNS = [
  {
    id: 'drink',
    label: 'cannot drink or breastfeed',
    text: 'Can the child drink or breastfeed?',
    triggerOn: 'no',
    outcome: 'urgent',
  },
  {
    id: 'vomit',
    label: 'vomits everything',
    text: 'Does the child vomit everything they eat or drink?',
    triggerOn: 'yes',
    outcome: 'urgent',
  },
  {
    id: 'seizure',
    label: 'seizure',
    text: 'Has the child had a seizure or fit?',
    triggerOn: 'yes',
    outcome: 'urgent',
  },
  {
    id: 'consciousness',
    label: 'very sleepy or unconscious',
    text: 'Is the child very sleepy, difficult to wake, or unconscious?',
    triggerOn: 'yes',
    outcome: 'urgent',
  },
  {
    id: 'indrawing',
    label: 'chest indrawing',
    text: 'Does the child’s chest pull in deeply when breathing?',
    triggerOn: 'yes',
    outcome: 'breathing',
  },
  {
    id: 'stridor',
    label: 'stridor while calm',
    text: 'Does the child make a loud, harsh noise while breathing calmly?',
    triggerOn: 'yes',
    outcome: 'urgent',
  },
]

/** Screening is validated for children below this age, in completed years. */
export const MAX_AGE_YEARS = 5
