import { useState } from 'react'
import { DANGER_SIGNS, MAX_AGE_YEARS } from './data/dangerSigns.js'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import AgeGateScreen from './screens/AgeGateScreen.jsx'
import OutOfScopeScreen from './screens/OutOfScopeScreen.jsx'
import TriageScreen from './screens/TriageScreen.jsx'
import UrgentScreen from './screens/UrgentScreen.jsx'
import BreathingScreen from './screens/BreathingScreen.jsx'
import RiskProfileScreen from './screens/RiskProfileScreen.jsx'
import SymptomMatrixScreen from './screens/SymptomMatrixScreen.jsx'

export default function App() {
  const [screen, setScreen] = useState('welcome')
  const [detectedSigns, setDetectedSigns] = useState([])
  const [fastTrack, setFastTrack] = useState(false)
  const [ageYears, setAgeYears] = useState(null)
  // Visual language state only — content is not translated yet.
  const [lang, setLang] = useState('en')

  const shared = { lang, onLangChange: setLang }

  function startNewScreening() {
    setDetectedSigns([])
    setFastTrack(false)
    setAgeYears(null)
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
          onContinue={() => setScreen('symptoms')}
        />
      )

    case 'symptoms':
      return <SymptomMatrixScreen {...shared} />

    default:
      return <WelcomeScreen {...shared} onStart={() => setScreen('age')} />
  }
}
