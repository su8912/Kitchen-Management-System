/**
 * TriLangNameInput
 *
 * A self-contained name-entry widget that handles English, Gujarati and Hindi.
 *
 * Features
 * --------
 *  • Language toggle at the top — choose whether you're typing in Gujarati or English
 *  • "Auto-translate" checkbox — when checked, typing in the primary field auto-fills
 *    the other two via the unofficial Google Translate endpoint (free, no key needed)
 *  • Secondary fields render as read-only rows with an "Edit" button; clicking Edit
 *    turns them into a normal text input and stops auto-fill for that field
 *  • Debounce: 600 ms after the last keystroke before the API is called
 */

import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translateToOthers, type LangCode } from '@/lib/translate'
import { Input } from '@/components/ui/input'

// ─────────────────────────────────────────────────────────────────────────────

export interface TriLangValue {
  nameE: string
  nameG: string
  nameH: string
}

interface Props {
  value: TriLangValue
  onChange: (v: TriLangValue) => void
}

// Label metadata for each language slot
const LANG_META: Record<LangCode, { label: string; placeholder: string; dir?: string }> = {
  gu: { label: 'નામ (Gujarati)', placeholder: 'ગુજરાતી નામ' },
  en: { label: 'Name (English)', placeholder: 'English name' },
  hi: { label: 'नाम (Hindi)', placeholder: 'हिन्दी नाम' },
}

const FIELD_KEY: Record<LangCode, keyof TriLangValue> = {
  en: 'nameE',
  gu: 'nameG',
  hi: 'nameH',
}

// ─────────────────────────────────────────────────────────────────────────────

export function TriLangNameInput({ value, onChange }: Props) {
  // Which language the user is typing in
  const [primaryLang, setPrimaryLang] = useState<'gu' | 'en'>('gu')

  // Whether to auto-translate from the primary language
  const [autoTranslate, setAutoTranslate] = useState(true)

  // Track which secondary fields have been manually edited (auto-fill skipped)
  const [manualOverride, setManualOverride] = useState<Partial<Record<LangCode, boolean>>>({})

  // Whether a translation request is in-flight
  const [translating, setTranslating] = useState(false)

  // The two secondary languages (always Hindi + whichever of en/gu is not primary)
  const secondaryLangs: LangCode[] = (
    primaryLang === 'gu' ? ['en', 'hi'] : ['gu', 'hi']
  ) as LangCode[]

  // Keep track of the latest value to prevent async translation from overwriting ongoing typing
  const latestValueRef = useRef(value)
  latestValueRef.current = value

  // ── Handle translation ───────────────────────────────────────────────────

  async function triggerTranslation(textToTranslate: string) {
    if (!autoTranslate || !textToTranslate.trim()) return

    setTranslating(true)
    try {
      const result = await translateToOthers(textToTranslate, primaryLang)

      // We only merge the translations into the SECONDARY languages.
      // We read from latestValueRef so we don't accidentally erase anything
      // the user typed in the primary field while the API was loading.
      const latest = latestValueRef.current
      const nextVal = { ...latest }

      for (const lang of secondaryLangs) {
        if (!manualOverride[lang]) {
          nextVal[FIELD_KEY[lang]] = result[FIELD_KEY[lang]]
        }
      }

      onChange(nextVal)
    } catch {
      // Silently ignore
    } finally {
      setTranslating(false)
    }
  }

  // ── Handle primary field change ──────────────────────────────────────────

  function handlePrimaryChange(text: string) {
    // Update primary field immediately
    onChange({ ...value, [FIELD_KEY[primaryLang]]: text })

    // Reset manual overrides when primary input changes
    setManualOverride({})

    // If the user just typed a space, seamlessly translate the word
    if (autoTranslate && text.endsWith(' ') && text.trim().length > 0) {
      const prevText = value[FIELD_KEY[primaryLang]]
      // Only trigger if we didn't just have a space (prevent spam on multiple spaces)
      if (!prevText.endsWith(' ')) {
        triggerTranslation(text)
      }
    }
  }

  // ── Handle translate on blur (when user finishes typing) ─────────────────

  function handlePrimaryBlur() {
    triggerTranslation(primaryValue)
  }

  // ── Handle secondary field manual override ───────────────────────────────

  function handleSecondaryChange(lang: LangCode, text: string) {
    setManualOverride((prev) => ({ ...prev, [lang]: true }))
    onChange({ ...value, [FIELD_KEY[lang]]: text })
  }

  // ── When toggle switches, reset overrides ────────────────────────────────

  function switchPrimary(lang: 'gu' | 'en') {
    setPrimaryLang(lang)
    setManualOverride({})
  }

  // ─────────────────────────────────────────────────────────────────────────

  const primaryValue = value[FIELD_KEY[primaryLang]]

  return (
    <div className="space-y-3">
      {/* ── Top bar: toggle + auto-translate checkbox ── */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
        {/* Language toggle */}
        <div className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => switchPrimary('gu')}
            className={cn(
              'rounded px-2.5 py-1 font-medium transition-colors',
              primaryLang === 'gu'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span lang="gu">ગુ</span>&nbsp;→ A
          </button>

          {/* Visual divider */}
          <span className="mx-1 select-none text-muted-foreground">|</span>

          <button
            type="button"
            onClick={() => switchPrimary('en')}
            className={cn(
              'rounded px-2.5 py-1 font-medium transition-colors',
              primaryLang === 'en'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            A →&nbsp;<span lang="gu">ગુ</span>
          </button>
        </div>

        {/* Auto-translate toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
          <div
            role="switch"
            aria-checked={autoTranslate}
            onClick={() => setAutoTranslate((p) => !p)}
            className={cn(
              'relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none',
              autoTranslate ? 'bg-primary' : 'bg-input',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                autoTranslate ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </div>
          Auto-translate
          {translating && <Loader2 className="h-3 w-3 animate-spin" />}
        </label>
      </div>

      {/* ── Primary input field ── */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {LANG_META[primaryLang].label}
          <span className="ml-1 text-destructive">*</span>
        </label>
        <Input
          lang={primaryLang}
          value={primaryValue}
          onChange={(e) => handlePrimaryChange(e.target.value)}
          onBlur={handlePrimaryBlur}
          placeholder={LANG_META[primaryLang].placeholder}
          className="border-primary/50 focus-visible:ring-primary/30"
        />
      </div>

      {/* ── Secondary fields ── */}
      {secondaryLangs.map((lang) => {
        const fieldVal = value[FIELD_KEY[lang]]
        const isOverridden = !!manualOverride[lang]
        const meta = LANG_META[lang]

        return (
          <div key={lang}>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {meta.label}
              <span className="ml-1 text-destructive">*</span>
            </label>

            {autoTranslate && !isOverridden ? (
              /* Read-only row with Edit button — matches the sample photo */
              <div className="flex items-center gap-2">
                <div className={cn(
                  'flex-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm min-h-[36px]',
                  !fieldVal && 'text-muted-foreground italic',
                  translating && 'animate-pulse',
                )}>
                  <span lang={lang}>
                    {fieldVal || (translating ? 'Translating…' : meta.placeholder)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setManualOverride((p) => ({ ...p, [lang]: true }))}
                  className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Edit
                </button>
              </div>
            ) : (
              /* Editable input — after clicking Edit */
              <Input
                lang={lang}
                value={fieldVal}
                onChange={(e) => handleSecondaryChange(lang, e.target.value)}
                placeholder={meta.placeholder}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
