import { useState } from 'react'
import { DANGER_SIGNS, MAX_AGE_YEARS } from './data/dangerSigns.js'
import { deriveFindings, scoreFindings, makeReferralCode } from './data/scoring.js'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import AgeGateScreen from './screens/AgeGateScreen.jsx'
import OutOfScopeScreen from './screens/OutOfScopeScreen.jsx'
import TriageScreen from './screens/TriageScreen.jsx'
import UrgentScreen from './screens/UrgentScreen.jsx'
import BreathingScreen from './screens/BreathingScreen.jsx'
import VisitTypeScreen from './screens/VisitTypeScreen.jsx'
import RiskProfileScreen from './screens/RiskProfileScreen.jsx'
import LowerRiskScreen from './screens/LowerRiskScreen.jsx'
import MwrdScreen from './screens/MwrdScreen.jsx'
import ContactScreen from './screens/ContactScreen.jsx'
import SymptomMatrixScreen, {
  EMPTY_SYMPTOMS,
} from './screens/SymptomMatrixScreen.jsx'
import XrayScanScreen from './screens/XrayScanScreen.jsx'
import XrayFeaturesScreen from './screens/XrayFeaturesScreen.jsx'
import ResultsScreen from './screens/ResultsScreen.jsx'

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [detectedSigns, setDetectedSigns] = useState([])
  const [fastTrack, setFastTrack] = useState(false)
  const [ageYears, setAgeYears] = useState(null)
  const [highRisk, setHighRisk] = useState(false)
  const [score, setScore] = useState(null)
  const [visitType, setVisitType] = useState(null)
  const [mwrdPositive, setMwrdPositive] = useState(false)
  const [contactPositive, setContactPositive] = useState(false)
  const [referralCode, setReferralCode] = useState(null)
  const [symptoms, setSymptoms] = useState(EMPTY_SYMPTOMS)
  const [xray, setXray] = useState(null)
  // Visual language state only — content is not translated yet.
  const [lang, setLang] = useState('en')

  const shared = { lang, onLangChange: setLang }

  function startNewScreening() {
    setDetectedSigns([])
    setFastTrack(false)
    setAgeYears(null)
    setHighRisk(false)
    setScore(null)
    setVisitType(null)
    setMwrdPositive(false)
    setContactPositive(false)
    setReferralCode(null)
    setSymptoms(EMPTY_SYMPTOMS)
    setXray(null)
    setScreen('welcome')
  }

  switch (screen) {
    case 'visitType':
      return (
        <VisitTypeScreen
          {...shared}
          onAnswer={(type) => {
            setVisitType(type)
            setScreen('age')
          }}
          onBack={() => setScreen('welcome')}
        />
      )

    case 'age':
      return (
        <AgeGateScreen
          {...shared}
          onSubmit={(years) => {
            setAgeYears(years)
            setScreen(years < MAX_AGE_YEARS ? 'triage' : 'outOfScope')
          }}
          onBack={() => setScreen('visitType')}
        />
      )

    case 'outOfScope':
      return <OutOfScopeScreen {...shared} onBack={() => setScreen('age')} />

    case 'triage':
      return (
        <TriageScreen
          {...shared}
          /* Remount on entry so a restarted triage begins at question 1. */
          key="triage"
          questions={DANGER_SIGNS}
          onComplete={(signs) => {
            setDetectedSigns(signs)
            // Urgent outranks breathing; breathing outranks all-clear.
            if (signs.some((s) => s.outcome === 'urgent')) setScreen('urgent')
            else if (signs.some((s) => s.outcome === 'breathing'))
              setScreen('breathing')
            else setScreen('risk')
          }}
          onExit={() => setScreen('age')}
        />
      )

    case 'breathing':
      return (
        <BreathingScreen
          {...shared}
          onSevere={() => setScreen('urgent')}
          onNoSevere={() => {
            setFastTrack(true)
            setScreen('risk')
          }}
        />
      )

    case 'urgent':
      return (
        <UrgentScreen
          {...shared}
          signs={detectedSigns}
          onRestart={startNewScreening}
        />
      )

    case 'risk':
      return (
        <RiskProfileScreen
          {...shared}
          ageYears={ageYears}
          fastTrack={fastTrack}
          onContinue={(isHighRisk) => {
            setHighRisk(isHighRisk)
            /* Lower-risk children on a first visit are treated for the likely
               non-TB cause and re-evaluated before any scoring. High-risk
               children, and lower-risk children returning with persistent or
               worsening symptoms, go on to the mWRD step. */
            const deferToFollowUp = !isHighRisk && visitType === 'first'
            setScreen(deferToFollowUp ? 'lowerRisk' : 'mwrd')
          }}
        />
      )

    case 'lowerRisk':
      return (
        <LowerRiskScreen {...shared} onScheduleFollowUp={startNewScreening} />
      )

    case 'mwrd':
      return (
        <MwrdScreen
          {...shared}
          onAnswer={(detected) => {
            setMwrdPositive(detected)
            if (detected) {
              /* A positive rapid result starts treatment: skip scoring. */
              setScore(null)
              setReferralCode(makeReferralCode())
              setScreen('results')
            } else {
              setScreen('contact')
            }
          }}
          onBack={() => setScreen('risk')}
        />
      )

    case 'contact':
      return (
        <ContactScreen
          {...shared}
          onAnswer={(hasContact) => {
            setContactPositive(hasContact)
            if (hasContact) {
              /* Contact history alone indicates treatment: skip scoring. */
              setScore(null)
              setReferralCode(makeReferralCode())
              setScreen('results')
            } else {
              setScreen('symptoms')
            }
          }}
          onBack={() => setScreen('mwrd')}
        />
      )

    case 'symptoms':
      return (
        <SymptomMatrixScreen
          {...shared}
          ageYears={ageYears}
          symptoms={symptoms}
          onChange={(patch) => setSymptoms((prev) => ({ ...prev, ...patch }))}
          onScanXray={() => setScreen('xrayScan')}
          onCalculate={(result) => {
            setScore(result)
            setReferralCode(makeReferralCode())
            setScreen('results')
          }}
        />
      )

    case 'xrayScan':
      return (
        <XrayScanScreen
          {...shared}
          onAnalyzed={({ analysis, capturedDataUrl }) => {
            setXray({ analysis, capturedDataUrl })
            setScreen('xrayFeatures')
          }}
          onBack={() => setScreen('symptoms')}
        />
      )

    case 'xrayFeatures':
      return (
        <XrayFeaturesScreen
          {...shared}
          analysis={xray?.analysis}
          onConfirm={(confirmedCxr) => {
            /* An X-ray was read, so Algorithm A applies: the symptom items are
               rescored with Sum A weights and combined with Sum B. */
            const findings = deriveFindings(symptoms)
            setScore(
              scoreFindings(findings, { algorithm: 'A', cxr: confirmedCxr })
            )
            setReferralCode(makeReferralCode())
            setScreen('results')
          }}
          onBack={() => setScreen('xrayScan')}
        />
      )

    case 'results':
      return (
        <ResultsScreen
          {...shared}
          score={score}
          mwrdPositive={mwrdPositive}
          contactPositive={contactPositive}
          highRisk={highRisk}
          referralCode={referralCode}
          heatmapOverlay={xray?.analysis?.heatmap_overlay ?? null}
          onRestart={startNewScreening}
        />
      )

    default:
      return <WelcomeScreen {...shared} onStart={() => setScreen('visitType')} />
  }
}
