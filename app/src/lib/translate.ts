/**
 * translate.ts
 *
 * Uses the unofficial Google Translate endpoint (client=gtx).
 * No API key. No cost. No hard limit for internal usage.
 * Supports: en, gu (Gujarati), hi (Hindi)
 */

export type LangCode = 'en' | 'gu' | 'hi'

/**
 * Translate `text` from `from` language to `to` language.
 * Returns the translated string, or throws on network/parse error.
 */
export async function translateText(
  text: string,
  from: LangCode,
  to: LangCode,
): Promise<string> {
  if (!text.trim() || from === to) return text

  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', from)
  url.searchParams.set('tl', to)
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Translate HTTP ${res.status}`)

  // Response shape: [ [ ["translated","original"], ... ], ... ]
  const json = await res.json()
  const translated: string = json[0]
    .map((chunk: [string]) => chunk[0])
    .join('')

  return translated
}

/**
 * Translate `text` into BOTH other languages simultaneously.
 * Given primary language, returns all three in parallel.
 */
export async function translateToOthers(
  text: string,
  primaryLang: LangCode,
): Promise<{ nameE: string; nameG: string; nameH: string }> {
  const langs: LangCode[] = ['en', 'gu', 'hi']
  const others = langs.filter((l) => l !== primaryLang) as LangCode[]

  const [a, b] = await Promise.all([
    translateText(text, primaryLang, others[0]),
    translateText(text, primaryLang, others[1]),
  ])

  const result = { en: '', gu: '', hi: '' } as Record<LangCode, string>
  result[primaryLang] = text
  result[others[0]] = a
  result[others[1]] = b

  return { nameE: result.en, nameG: result.gu, nameH: result.hi }
}
