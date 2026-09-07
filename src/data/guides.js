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
 * Each entry lists its pictures per language. Nothing falls back silently: a
 * language with no entry shows no picture, because these charts are dense with
 * text and an English one under an Urdu question is worse than none. Adding a
 * third language means adding its key here and nothing else.
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

import seizureUr from '../assets/guides/ur/seizure.webp'
import stridorUr from '../assets/guides/ur/stridor.webp'
import dehydrationUr from '../assets/guides/ur/dehydration.webp'
import pallorUr from '../assets/guides/ur/pallor.webp'
import neckStiffnessUr from '../assets/guides/ur/neck-stiffness.webp'
import breathingSevereUr from '../assets/guides/ur/breathing-severe.webp'
import muacUr from '../assets/guides/ur/muac.webp'
import lymphNodesUr from '../assets/guides/ur/lymph-nodes.webp'

/** Each entry: the alt-text key, then the pictures for each language. */
export const GUIDES = {
  // Danger signs, asked one at a time in triage.
  seizure: { alt: 'seizure', en: [seizure], ur: [seizureUr] },
  stridor: { alt: 'stridor', en: [stridor], ur: [stridorUr] },
  dehydration: { alt: 'dehydration', en: [dehydration], ur: [dehydrationUr] },
  pallor: { alt: 'pallor', en: [pallor], ur: [pallorUr] },
  neckStiffness: {
    alt: 'neckStiffness',
    en: [neckStiffness],
    ur: [neckStiffnessUr],
  },

  // Chest indrawing is the same file in both languages, and deliberately so:
  // it is four numbered photographs and two arrows with no writing anywhere in
  // it, so there is nothing to translate. Shared rather than duplicated.
  indrawing: { alt: 'indrawing', en: [chestIndrawing], ur: [chestIndrawing] },

  // The severity check that follows chest indrawing.
  breathingSevere: {
    alt: 'breathingSevere',
    en: [breathingSevere],
    ur: [breathingSevereUr],
  },

  // Risk profile.
  muac: { alt: 'muac', en: [muac], ur: [muacUr] },

  // Symptom matrix.
  lymphNodes: { alt: 'lymphNodes', en: [lymphNodes], ur: [lymphNodesUr] },

  // No `ur`, on purpose. This picture carries its instruction in English
  // typography — "Respiratory rate", "The worker types in breaths per minute",
  // "In... Out..." — so in Urdu it is not shown at all rather than shown in the
  // wrong language. Drop an Urdu version into the build script and it appears.
  respiratoryRate: { alt: 'respiratoryRate', en: [respiratoryRate] },
}

/**
 * Pictures for a question in the language on screen, or null if there are
 * none. Returned as {src, alt} so the viewer needs to know nothing about
 * languages.
 */
export function guideImages(key, lang) {
  const guide = GUIDES[key]
  const sources = guide?.[lang]
  if (!sources?.length) return null
  return sources.map((src) => ({ src, alt: guide.alt }))
}

export function hasGuide(key, lang) {
  return guideImages(key, lang) !== null
}
