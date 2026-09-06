/**
 * Visual guides: what each sign actually looks like on a child.
 *
 * A Lady Health Worker may meet stridor or a bulging fontanelle a handful of
 * times a year. The question text alone assumes she already knows the sign;
 * the picture is what makes the answer reliable.
 *
 * Keys are the question they belong to — danger sign ids from
 * `dangerSigns.js`, plus the four asked outside triage. A question with no
 * entry here simply renders without a guide.
 *
 * Artwork is built from the originals by `scripts/build_guides.py`; alt text
 * lives in the dictionaries under `guide.alt.<key>`.
 */
import seizure from '../assets/guides/seizure.webp'
import stridor from '../assets/guides/stridor.webp'
import dehydration from '../assets/guides/dehydration.webp'
import pallor from '../assets/guides/pallor.webp'
import neckStiffness from '../assets/guides/neck-stiffness.webp'
import breathingSevere from '../assets/guides/breathing-severe.webp'
import muac from '../assets/guides/muac.webp'
import lymphNodes from '../assets/guides/lymph-nodes.webp'
import chestIndrawing from '../assets/guides/chest-indrawing.webp'
import respiratoryRate from '../assets/guides/respiratory-rate.webp'

/** Each entry is the pictures for one question, with its own alt-text key. */
export const GUIDES = {
  // Danger signs, asked one at a time in triage.
  seizure: [{ src: seizure, alt: 'seizure' }],
  // Key must match the danger sign id in dangerSigns.js.
  indrawing: [{ src: chestIndrawing, alt: 'indrawing' }],
  stridor: [{ src: stridor, alt: 'stridor' }],
  dehydration: [{ src: dehydration, alt: 'dehydration' }],
  pallor: [{ src: pallor, alt: 'pallor' }],
  neckStiffness: [{ src: neckStiffness, alt: 'neckStiffness' }],

  // The severity check that follows chest indrawing.
  breathingSevere: [{ src: breathingSevere, alt: 'breathingSevere' }],

  // Risk profile.
  muac: [{ src: muac, alt: 'muac' }],

  // Symptom matrix.
  lymphNodes: [{ src: lymphNodes, alt: 'lymphNodes' }],
  respiratoryRate: [{ src: respiratoryRate, alt: 'respiratoryRate' }],
}

export function hasGuide(key) {
  return Boolean(key && GUIDES[key])
}
