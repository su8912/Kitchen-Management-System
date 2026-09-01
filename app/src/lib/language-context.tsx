/**
 * language-context.tsx — React context that provides the current UI language.
 *
 * Usage:
 *   const { lang, setLang, t, pickName } = useLang()
 *
 * - `t('nav.todaysMeal')` → returns the string in the current language
 * - `pickName(item)` → returns item.nameG / nameH / nameE based on lang
 * - `setLang('hi')` → switches to Hindi, persists in localStorage
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { dictionary, type Lang } from './i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Translate a dictionary key to the current language. */
  t: (key: string) => string
  /** Pick the right name field from a Named object ({ nameG, nameH, nameE }). */
  pickName: (obj: { nameG: string; nameH: string; nameE: string }) => string
  /** Pick from a { e, g, h } label record (UNIT_LABEL, MEAL_LABEL, etc.). */
  pickLabel: (obj: { e: string; g: string; h: string }) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'app-lang'

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'gu' || v === 'hi' || v === 'en') return v
  } catch { /* SSR or blocked storage */ }
  return 'gu' // default
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* noop */ }
  }, [])

  const t = useCallback(
    (key: string): string => {
      const entry = dictionary[key]
      if (!entry) {
        console.warn(`[i18n] Missing key: "${key}"`)
        return key
      }
      return entry[lang]
    },
    [lang],
  )

  const pickName = useCallback(
    (obj: { nameG: string; nameH: string; nameE: string }): string => {
      switch (lang) {
        case 'gu': return obj.nameG
        case 'hi': return obj.nameH
        case 'en': return obj.nameE
      }
    },
    [lang],
  )

  const pickLabel = useCallback(
    (obj: { e: string; g: string; h: string }): string => {
      switch (lang) {
        case 'gu': return obj.g
        case 'hi': return obj.h
        case 'en': return obj.e
      }
    },
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, pickName, pickLabel }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang() must be inside <LanguageProvider>')
  return ctx
}
