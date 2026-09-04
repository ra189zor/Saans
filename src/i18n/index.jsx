import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { en } from './en.js'
import { ur } from './ur.js'

const DICTIONARIES = { en, ur }

export const LANGUAGES = [
  { code: 'en', direction: 'ltr' },
  { code: 'ur', direction: 'rtl' },
]

/** English is the default; Urdu is opt-in. */
export const DEFAULT_LANGUAGE = 'en'

const STORAGE_KEY = 'saans.lang'

function resolve(dictionary, path) {
  return path
    .split('.')
    .reduce((node, key) => (node == null ? undefined : node[key]), dictionary)
}

function interpolate(template, vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match
  )
}

/**
 * Look up `path` in the active language, falling back to English and finally
 * to the path itself, so a missing translation degrades to readable English
 * rather than a blank screen.
 */
export function translate(lang, path, vars) {
  const value = resolve(DICTIONARIES[lang] ?? en, path) ?? resolve(en, path)
  if (typeof value !== 'string') return path
  return interpolate(value, vars)
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && DICTIONARIES[stored]) return stored
    } catch {
      /* private mode or blocked storage — fall through to the default */
    }
    return DEFAULT_LANGUAGE
  })

  const direction = lang === 'ur' ? 'rtl' : 'ltr'

  useEffect(() => {
    /* Drives every logical-property flip in the stylesheet. */
    const root = document.documentElement
    root.lang = lang
    root.dir = direction
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* Preference simply won't persist. */
    }
  }, [lang, direction])

  const setLang = useCallback((next) => {
    if (DICTIONARIES[next]) setLangState(next)
  }, [])

  const t = useCallback((path, vars) => translate(lang, path, vars), [lang])

  const value = useMemo(
    () => ({ lang, setLang, t, direction, isRtl: direction === 'rtl' }),
    [lang, setLang, t, direction]
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useI18n must be used inside <LanguageProvider>')
  }
  return context
}
