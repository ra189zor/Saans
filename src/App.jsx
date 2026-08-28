import { useState } from 'react'
import { DANGER_SIGNS, MAX_AGE_YEARS } from './data/dangerSigns.js'
import { makeReferralCode } from './data/scoring.js'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import AgeGateScreen from './screens/AgeGateScreen.jsx'
import OutOfScopeScreen from './screens/OutOfScopeScreen.jsx'
import TriageScreen from './screens/TriageScreen.jsx'
import UrgentScreen from './screens/UrgentScreen.jsx'
import BreathingScreen from './screens/BreathingScreen.jsx'
import RiskProfileScreen from './screens/RiskProfileScreen.jsx'
import ContactScreen from './screens/ContactScreen.jsx'
import SymptomMatrixScreen from './screens/SymptomMatrixScreen.jsx'
import ResultsScreen from './screens/ResultsScreen.jsx'

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [detectedSigns, setDetectedSigns] = useState([])
  const [fastTrack, setFastTrack] = useState(false)
  const [ageYears, setAgeYears] = useState(null)
  const [highRisk, setHighRisk] = useState(false)
  const [score, setScore] = useState(null)
  const [contactPositive, setContactPositive] = useState(false)
  const [referralCode, setReferralCode] = useState(null)
  // Visual language state only — content is not translated yet.
  const [lang, setLang] = useState('en')

  const shared = { lang, onLangChange: setLang }

  function startNewScreening() {
    setDetectedSigns([])
    setFastTrack(false)
    setAgeYears(null)
    setHighRisk(false)
    setScore(null)
    setContactPositive(false)
    setReferralCode(null)
    setScreen('welcome')
  }

  switch (screen) {
    case 'age':
      return (
        <AgeGateScreen
          {...shared}
          onSubmit={(years) => {
            setAgeYears(years)
            setScreen(years < MAX_AGE_YEARS ? 'triage' : 'outOfScope')
          }}
          onBack={() => setScreen('welcome')}
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
            setScreen('contact')
          }}
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
          onBack={() => setScreen('risk')}
        />
      )

    case 'symptoms':
      return (
        <SymptomMatrixScreen
          {...shared}
          ageYears={ageYears}
          onCalculate={(result) => {
            setScore(result)
            setReferralCode(makeReferralCode())
            setScreen('results')
          }}
        />
      )

    case 'results':
      return (
        <ResultsScreen
          {...shared}
          score={score}
          contactPositive={contactPositive}
          highRisk={highRisk}
          referralCode={referralCode}
          onRestart={startNewScreening}
        />
      )

    default:
      return <WelcomeScreen {...shared} onStart={() => setScreen('age')} />
  }
}
