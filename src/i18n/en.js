/**
 * English source strings. Keys are grouped by screen; `ur.js` mirrors this
 * shape exactly. Interpolation uses {name} placeholders.
 */
export const en = {
  common: {
    yes: 'Yes',
    no: 'No',
    yesEmphatic: 'YES',
    noEmphatic: 'NO',
    back: 'Back',
    continue: 'Continue',
    startNewScreening: 'Start New Screening',
    aiComingSoon: 'AI feature coming next',
    days: '{count} days',
    daysOne: '1 day',
    // Urdu uses the Arabic comma (U+060C), which leans the other way.
    listSeparator: ', ',
    offline:
      'No internet connection. Screening and scoring still work — only the X-ray, cough and handbook features need a connection.',
    serverUnreachable:
      'Cannot reach the Saans service. Screening and scoring still work without it.',
  },

  topBar: {
    brand: 'Saans',
    languageEnglish: 'EN',
    languageUrdu: 'اردو',
  },

  welcome: {
    tagline: 'Protecting every breath',
    dividerLeft: 'Paediatric TB Screening',
    dividerRight: 'WHO Algorithm B',
    start: 'Start Screening',
    footer: 'v0.1 · Offline-ready · Designed for Lady Health Workers, Pakistan',
  },

  visitType: {
    question: 'Is this a first visit or a follow-up?',
    first: 'First visit',
    followUp: 'Follow-up after 1–2 weeks (symptoms persisted or worsened)',
  },

  ageGate: {
    question: 'How old is the child?',
    unit: 'years',
    hint: 'Enter age in completed years. Use 0 for infants under one year.',
  },

  outOfScope: {
    label: 'Outside Validated Range',
    body: 'Saans v0.1 is validated for children under 5 using the WHO IMCI framework.',
    advice: 'For children aged 5–9, please involve a clinician (ETAT framework).',
  },

  triage: {
    progress: 'Question {current} of {total}',
  },

  guide: {
    howToCheck: 'How to check',
    close: 'Close',
    zoomHint: 'Tap the picture to zoom in.',
    fitHint: 'Tap the picture again to fit it to the screen.',
    // Read aloud when the picture cannot be seen, so each one describes the
    // sign itself rather than naming the file.
    alt: {
      seizure:
        'Six drawings of a child during a seizure: jerking or shaking, the body or limbs stiffening, the eyes rolling up, no response when spoken to, frothing at the mouth, and loss of control of urine or stool.',
      stridor:
        'A child breathing in, with a loud harsh noise coming from the throat. Two examples compare a child with stridor against a child breathing quietly.',
      dehydration:
        'A health worker pinching the skin on a child’s upper arm, beside a chart showing the skin returning to normal in more than two seconds in severe dehydration, one to two seconds in some dehydration, and under a second when normal. Sunken eyes are also shown.',
      pallor:
        'A health worker opening a child’s palm to look at its colour, beside three palms: severe pallor where the palm is almost white, mild pallor where it is paler than normal, and a healthy pink palm.',
      neckStiffness:
        'A health worker gently bending a child’s head forward and feeling the soft spot on top of the head, with pairs comparing a neck that bends easily against a stiff neck, and a flat soft spot against a bulging one.',
      breathingSevere:
        'A close view of a child’s mouth, comparing blue or purple lips, which is a severe danger sign, against normal pink lips.',
      muac: 'A MUAC tape around a child’s upper arm reading in the yellow band, beside the three colour zones: red below 11.5 cm, yellow between 11.5 and 12.5 cm, and green at 12.5 cm or more.',
      lymphNodes:
        'Where to feel for swollen lymph nodes on a child — the sides of the neck, under the jaw, and behind the ears — with a comparison of a normal neck against one with a visible, firm, painless swelling.',
      indrawing:
        'A child lying down, in four steps: at rest, the chest lifting, then the wall of the lower chest drawing inwards below the ribs as the child breathes in, and back to rest.',
      respiratoryRate:
        'A child sitting calmly, with an arrow tracing the chest moving out and in — one breath, counted for a full minute.',
    },
  },

  dangerSigns: {
    drink: {
      text: 'Can the child drink or breastfeed?',
      label: 'cannot drink or breastfeed',
    },
    vomit: {
      text: 'Does the child vomit everything they eat or drink?',
      label: 'vomits everything',
    },
    seizure: {
      text: 'Has the child had a seizure or fit?',
      label: 'seizure',
    },
    consciousness: {
      text: 'Is the child very sleepy, difficult to wake, or unconscious?',
      label: 'very sleepy or unconscious',
    },
    indrawing: {
      text: 'Does the child’s chest pull in deeply when breathing?',
      label: 'chest indrawing',
    },
    stridor: {
      text: 'Does the child make a loud, harsh noise while breathing calmly?',
      label: 'stridor while calm',
    },
    dehydration: {
      text: 'Signs of severe dehydration (sunken eyes, skin pinch returns very slowly)?',
      label: 'severe dehydration',
    },
    pallor: {
      text: 'Severe palmar pallor?',
      label: 'severe palmar pallor',
    },
    hypoxia: {
      text: 'Oxygen saturation below 90% (if pulse oximeter available)?',
      label: 'oxygen saturation below 90%',
    },
    neckStiffness: {
      text: 'Neck stiffness or bulging fontanelle?',
      label: 'neck stiffness or bulging fontanelle',
    },
  },

  urgent: {
    band: 'Danger Sign Detected',
    lead: 'The child may be seriously ill. This is not a TB diagnosis.',
    body: 'Emergency care comes first: stabilize and refer to the nearest District Hospital immediately. TB evaluation will continue at the hospital.',
    detected: 'Detected',
  },

  breathing: {
    band: 'Breathing Problem Detected',
    lead: 'Check severity now.',
    severe:
      'Severe signs present (very severe chest indrawing, blue lips, or any danger sign)',
    noSevere: 'No severe signs',
  },

  riskProfile: {
    ageLabel: 'Child Age',
    ageNotRecorded: 'Not recorded',
    ageUnderOne: 'Under 1 year',
    ageOneYear: '1 year',
    ageYears: '{count} years',
    hivQuestion: 'Is the child known to be HIV positive?',
    muacQuestion: 'What colour does the MUAC tape show?',
    muac: {
      red: { name: 'Red', description: 'Severe malnutrition (below 115mm)' },
      yellow: { name: 'Yellow', description: 'Moderate malnutrition' },
      green: { name: 'Green', description: 'Normal' },
    },
    highRiskBadge: 'High Risk · Fast Track',
    whoAdvice:
      'WHO advises: treat common causes first and re-evaluate in 1–2 weeks. Continue this screening if symptoms persisted.',
    continue: 'Continue to Symptoms',
  },

  lowerRisk: {
    label: 'Lower Risk · Not Scored',
    guidance:
      'Treat most likely non-TB condition(s). Follow-up in 1–2 weeks. Continue screening only if symptoms persist or worsen.',
    action: 'Schedule follow-up',
  },

  mwrd: {
    question:
      'Was an mWRD (Xpert MTB/RIF or Ultra) or urine LF-LAM test performed?',
    detected: 'Yes — MTB detected',
    notDetected: 'Yes — not detected',
    pending: 'Result not yet available',
    notPerformed: 'Not performed',
  },

  contact: {
    question: 'Close or household TB contact in the previous 12 months?',
  },

  symptoms: {
    coughDuration: 'Cough duration',
    feverDuration: 'Fever duration',
    coughQualifies: 'Counts as cough longer than 2 weeks',
    feverQualifies: 'Counts as fever longer than 2 weeks',
    scoresAt: 'Scores at {days} days or more',
    maxDays: '{days} days',
    toggles: {
      lethargy: 'Persistent unexplained lethargy or reduced playfulness?',
      weightLoss: 'Weight loss or failure to thrive?',
      haemoptysis: 'Haemoptysis (coughing up blood)?',
      nightSweats: 'Night sweats?',
      lymphNodes: 'Painless, enlarged (swollen) lymph nodes?',
    },
    vitalsHeading: 'Vital Signs',
    respiratoryRate: 'Respiratory rate',
    respiratoryUnit: 'breaths/min',
    respiratoryHint: 'Tachypnoea above {threshold}/min at this age',
    heartRate: 'Heart rate',
    heartUnit: 'beats/min',
    heartHint: 'Tachycardia above {threshold}/min at this age',
    tachypnoea: 'Tachypnoea?',
    tachycardia: 'Tachycardia?',
    scanXray: 'Scan X-ray',
    recordCough: 'Record Cough',
    calculate: 'Calculate Risk Score',
  },

  vitalBands: {
    infant: '2–12 months',
    child: '1–5 years',
    older: 'over 5 years',
  },

  assistant: {
    title: 'Ask WHO Assistant',
    subtitle: 'Answers come only from the WHO Operational Handbook on Tuberculosis, Module 5. Nothing else.',
    tryAsking: 'Try asking',
    suggestions: {
      startTreatment: 'When should I start TB treatment?',
      fourMonth: 'What is the 4-month regimen?',
      malnutrition: 'How do I manage a child with severe malnutrition?',
    },
    placeholder: 'Type your question',
    send: 'Ask',
    thinking: 'Looking in the handbook...',
    sourceLabel: 'Source',
    page: 'Handbook page {page}',
    disclaimer:
      'This is a handbook lookup, not clinical advice, and it does not change the screening score. Check the page shown before acting on an answer.',
    noKey:
      'The assistant needs an internet connection and an API key. Everything else in Saans works without one.',
    noIndex:
      'The handbook has not been indexed yet. Run: python notebooks/build_who_index.py',
    serverDown: 'Cannot reach the Saans service. Check that the backend is running.',
  },

  coughRecord: {
    title: 'Record the cough',
    guidance:
      'Hold the tablet about 30 cm from the child and ask the carer to encourage a cough. Recording stops after 10 seconds.',
    start: 'Start recording',
    stop: 'Stop',
    recording: 'Recording',
    analyzing: 'Analysing the recording...',
    reRecord: 'Re-record',
    use: 'Use this recording',
    back: 'Back to symptoms',
    seeResult: 'See result',
    skip: 'Skip — no microphone',
    patternLabel: 'Cough pattern',
    characterLabel: 'Sound',
    coughsLabel: 'Coughs detected',
    pattern: {
      wet: 'Wet',
      dry: 'Dry',
      none: 'No clear cough',
    },
    character: {
      abnormal: 'Sounds abnormal',
      normal: 'Sounds normal',
      unclear: 'Not enough sound',
    },
    disclaimer:
      'Sound analysis is only a support hint - the decision comes from the WHO algorithm.',
    methodNote:
      'Cough detection is a model trained on adult recordings; wet or dry is estimated from acoustic features and is not yet calibrated. The WHO cough criterion is the two-week history you take, not this recording.',
    permissionDenied:
      'Microphone permission was refused. Allow microphone access in the browser and try again.',
    unsupported: 'This device or browser cannot record audio.',
  },

  xrayScan: {
    title: 'Scan chest X-ray',
    guidance:
      'Hold the chest X-ray film against a bright light or white screen.',
    startingCamera: 'Starting camera…',
    cameraUnavailable:
      'Camera unavailable on this device. Use “Upload image” below.',
    capture: 'Capture',
    upload: 'Upload image',
    uploadAria: 'Upload chest X-ray image',
    analyze: 'Analyze X-ray',
    analyzing: 'Analyzing…',
    retake: 'Retake',
    failed:
      'Analysis failed: {error}. Check that the vision service is running.',
    capturedAlt: 'Captured chest X-ray',
  },

  xrayFeatures: {
    title: 'Confirm chest X-ray features',
    probabilityLabel: 'Model TB probability',
    hint: 'Suggestions are pre-checked from the image analysis. Confirm or change them before scoring.',
    lymphNodePrompt:
      'Check the middle of the chest for enlarged lymph nodes yourself. This is the most common sign of TB in young children. The model cannot detect it, so this one is your judgement.',
    sumB: 'Sum B',
    confirm: 'Confirm and calculate',
    overlayAlt: 'Chest X-ray with model attention heatmap overlay',
  },

  cxrItems: {
    cavity: 'Cavity',
    enlargedLymphNodes: 'Enlarged lymph nodes',
    opacities: 'Opacities',
    miliary: 'Miliary pattern',
    effusion: 'Effusion',
  },

  symptomItems: {
    cough: 'Cough longer than 2 weeks',
    fever: 'Fever longer than 2 weeks',
    lethargy: 'Lethargy',
    weightLoss: 'Weight loss / failure to thrive',
    haemoptysis: 'Haemoptysis',
    nightSweats: 'Night sweats',
    lymphNodes: 'Swollen lymph nodes (cervical, submandibular or axillary)',
    tachycardia: 'Tachycardia',
    tachypnoea: 'Tachypnoea',
  },

  results: {
    scoreLabel: 'Risk Score',
    algorithmA: 'Algorithm A (with chest X-ray)',
    algorithmB: 'Algorithm B (without X-ray)',
    reasoning: 'Reasoning',
    sumAHeading: 'Sum A · Signs and symptoms',
    sumBHeading: 'Sum B · Chest X-ray',
    noFindings: 'No scoring findings recorded.',
    noSymptomFindings: 'No symptom findings recorded.',
    noCxrFindings: 'No CXR features confirmed.',
    thresholdWithXray:
      'Sum A {sumA} + Sum B {sumB} = {total}. Treatment is indicated when the total is greater than {threshold}.',
    thresholdNoXray:
      'Total {total}. Treatment is indicated when the total is greater than {threshold}.',
    treatTitle: 'TB Treatment Indicated',
    noTreatTitle: 'Treatment Not Indicated',
    decisionTreat: 'Initiate appropriate TB treatment.',
    decisionNoTreat:
      'Do not treat with TB treatment. Follow-up in 1–2 weeks.',
    immediateTreat: 'Initiate appropriate TB treatment immediately.',
    mwrdReason:
      'Register and notify to the NTP. Mycobacterium tuberculosis detected by mWRD or LF-LAM; no symptom score is calculated.',
    contactReason:
      'Close or household TB contact in the previous 12 months. Contact history alone indicates treatment; no symptom score is calculated.',
    referral: 'Refer to nearest PHC with referral code {code}.',
    highRiskNote: 'High-risk child — keep a low threshold for re-evaluation.',
    highRiskBadge: 'High Risk · Fast Track',
    askAssistant: 'Ask WHO Assistant',
    heatmapAlt: 'Chest X-ray heatmap',
    itemWithDays: '{label} ({count} days)',
    source:
      'Scores per WHO Operational Handbook on Tuberculosis, Module 5 (2022), Annex 5.',
  },
}
