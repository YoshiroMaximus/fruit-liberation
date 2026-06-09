import type { FruitType } from './types'

export interface IndexedType {
  id: number
  /** Best display name for the active locale. */
  name: string
  scientificName: string | null
  category: FruitType['categories'][number] | null
  emoji: string
  color: string
  /** Lower-cased haystack for search. */
  haystack: string
}

export interface TypeIndex {
  byId: Map<number, IndexedType>
  all: IndexedType[]
  search(query: string, limit?: number): IndexedType[]
  /** Resolve a list of type ids to display names (skips unknowns). */
  names(ids: number[]): string[]
  /** Find type ids whose name matches any of the given keywords (exact-ish). */
  idsForKeywords(keywords: string[]): Map<string, number[]>
}

/** Curated quick-pick fruits most people walk past. */
export const QUICK_PICKS = [
  'Apple',
  'Orange',
  'Lemon',
  'Lime',
  'Fig',
  'Plum',
  'Cherry',
  'Pear',
  'Peach',
  'Mulberry',
  'Blackberry',
  'Grape',
  'Walnut',
  'Avocado',
  'Pomegranate',
  'Persimmon',
] as const

/* Keyword → emoji (first match wins). */
const EMOJI: [RegExp, string][] = [
  [/crab\s?apple|\bapple\b|malus/i, '🍎'],
  [/pear|pyrus/i, '🍐'],
  [/tangerin|mandarin|clementine|\borange\b|citrus sinensis/i, '🍊'],
  [/grapefruit|pomelo/i, '🍊'],
  [/lemon|lime|citrus|kumquat|yuzu/i, '🍋'],
  [/peach|nectarine|apricot/i, '🍑'],
  [/cherry|prunus avium|prunus cerasus/i, '🍒'],
  [/grape|vitis/i, '🍇'],
  [/strawberr/i, '🍓'],
  [/blueberr|huckleberr|bilberr/i, '🫐'],
  [/blackberr|raspberr|mulberr|boysenberr|salmonberr|thimbleberr|berry|rubus/i, '🫐'],
  [/banana|plantain|musa/i, '🍌'],
  [/pineapple/i, '🍍'],
  [/mango|mangifera/i, '🥭'],
  [/coconut|cocos/i, '🥥'],
  [/avocado|persea/i, '🥑'],
  [/tomato|tomatillo/i, '🍅'],
  [/pepper|chili|capsicum/i, '🌶️'],
  [/olive|olea/i, '🫒'],
  [/walnut|chestnut|hazelnut|filbert|almond|acorn|pecan|hickory|pistachio|\bnut\b|juglans|quercus|carya/i, '🌰'],
  [/watermelon/i, '🍉'],
  [/melon|cantaloupe|honeydew/i, '🍈'],
  [/kiwi|actinidia/i, '🥝'],
  [/mushroom|fungus|fungi|bolet|chanterelle|morel/i, '🍄'],
  [/mint|basil|thyme|rosemary|sage|oregano|herb|lavender/i, '🌿'],
  [/plum|sloe|damson|greengage/i, '🟣'],
  [/fig|ficus/i, '🟤'],
  [/pomegranate|punica/i, '🔴'],
  [/persimmon|diospyros/i, '🟠'],
  [/rose|hawthorn|crataegus|rosa/i, '🌹'],
]

/* Keyword → recognizable color (overrides hashed hue). */
const COLORS: [RegExp, string][] = [
  [/crab\s?apple|\bapple\b|cherry|pomegranate|\bplum\b|tomato|rose|hawthorn|cranberr/i, '#e2474a'],
  [/tangerin|mandarin|\borange\b|persimmon|apricot|kumquat/i, '#f2861e'],
  [/lemon|lime|citrus|banana|grapefruit|yuzu/i, '#e8b923'],
  [/grape|blackberr|mulberr|\bfig\b|elderberr|plum|sloe/i, '#7d4fa0'],
  [/blueberr|huckleberr|bilberr/i, '#3f6fb0'],
  [/walnut|chestnut|hazelnut|almond|acorn|pecan|hickory|\bnut\b|coconut|olive/i, '#8a6a3b'],
  [/mushroom|fungus|fungi/i, '#b07a52'],
  [/mint|basil|thyme|rosemary|sage|herb|avocado|pear|kiwi/i, '#5a9e4b'],
  [/peach|nectarine|mango/i, '#f0a35e'],
]

function emojiFor(haystack: string): string {
  for (const [re, e] of EMOJI) if (re.test(haystack)) return e
  return '🌱'
}

function colorFor(haystack: string, category: string | null): string {
  for (const [re, c] of COLORS) if (re.test(haystack)) return c
  // Stable hashed hue as fallback.
  let h = 0
  for (let i = 0; i < haystack.length; i++) h = (h * 31 + haystack.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  const sat = category === 'honeybee' ? 70 : 55
  return `hsl(${hue}, ${sat}%, 48%)`
}

function resolveName(t: FruitType, locale: string): string {
  const common = t.common_names || {}
  const pick = (lang: string) => common[lang]?.[0]
  return (
    pick(locale) ||
    pick(locale.split('-')[0]) ||
    pick('en') ||
    t.scientific_names?.[0] ||
    Object.values(common)[0]?.[0] ||
    `Type #${t.id}`
  )
}

export function buildTypeIndex(types: FruitType[], locale = 'en'): TypeIndex {
  const all: IndexedType[] = []
  const byId = new Map<number, IndexedType>()

  for (const t of types) {
    const name = resolveName(t, locale)
    const scientificName = t.scientific_names?.[0] ?? null
    // Build a search haystack from every name in every language.
    const allNames = [
      ...Object.values(t.common_names || {}).flat(),
      ...(t.scientific_names || []),
    ]
    const haystack = [name, scientificName, ...allNames].filter(Boolean).join(' ').toLowerCase()
    const category = t.categories?.[0] ?? null
    const idx: IndexedType = {
      id: t.id,
      name,
      scientificName,
      category,
      emoji: emojiFor(haystack),
      color: colorFor(haystack, category),
      haystack,
    }
    all.push(idx)
    byId.set(t.id, idx)
  }

  all.sort((a, b) => a.name.localeCompare(b.name))

  function search(query: string, limit = 40): IndexedType[] {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const terms = q.split(/\s+/)
    const scored: { t: IndexedType; score: number }[] = []
    for (const t of all) {
      let score = 0
      let ok = true
      for (const term of terms) {
        const i = t.haystack.indexOf(term)
        if (i === -1) {
          ok = false
          break
        }
        // Earlier match + name start = higher score.
        score += i === 0 ? 100 : t.name.toLowerCase().startsWith(term) ? 50 : 10 - Math.min(i, 9)
      }
      if (ok) scored.push({ t, score })
    }
    scored.sort((a, b) => b.score - a.score || a.t.name.length - b.t.name.length)
    return scored.slice(0, limit).map((s) => s.t)
  }

  function names(ids: number[]): string[] {
    const out: string[] = []
    for (const id of ids) {
      const t = byId.get(id)
      if (t) out.push(t.name)
    }
    return out
  }

  function idsForKeywords(keywords: string[]): Map<string, number[]> {
    const map = new Map<string, number[]>()
    for (const kw of keywords) {
      const lower = kw.toLowerCase()
      const matches = all
        .filter((t) => {
          const n = t.name.toLowerCase()
          return n === lower || n.includes(lower) || t.haystack.includes(lower)
        })
        // Prefer shorter names (genus/species over long cultivars) and cap count.
        .sort((a, b) => a.name.length - b.name.length)
        .slice(0, 25)
        .map((t) => t.id)
      map.set(kw, matches)
    }
    return map
  }

  return { byId, all, search, names, idsForKeywords }
}
