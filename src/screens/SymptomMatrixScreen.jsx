import Screen, { COLUMN } from '../components/Screen.jsx'
import TopBar from '../components/TopBar.jsx'

export default function SymptomMatrixScreen({ lang, onLangChange }) {
  return (
    <Screen>
      <TopBar lang={lang} onLangChange={onLangChange} />

      <main
        className={`${COLUMN} flex flex-1 items-center justify-center py-10`}
      >
        <p className="text-center text-2xl font-medium text-muted md:text-3xl">
          Symptom Matrix (coming next)
        </p>
      </main>
    </Screen>
  )
}
