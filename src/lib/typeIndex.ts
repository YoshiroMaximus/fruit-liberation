import type { FruitType } from './types'

export interface IndexedType {
  id: number
  /** Best display name for the active locale. */
  name: string
  scientificName: string | null
  /** Specific emoji for UI lists (e.g. 🍋 for lemon). */
  emoji: string
  /** Coarse category for marker color/icon + the legend. */
  kind: CategoryKey
  /** Category color (used for markers and the colored emoji tiles). */
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

function emojiFor(haystack: string): string {
  for (const [re, e] of EMOJI) if (re.test(haystack)) return e
  return '🌱'
}

export type CategoryKey =
  | 'pome'
  | 'citrus'
  | 'stone'
  | 'berry'
  | 'nut'
  | 'herb'
  | 'fungi'
  | 'tropical'
  | 'other'

export interface Category {
  key: CategoryKey
  label: string
  emoji: string
  color: string
}

/** The coarse categories markers are colored/iconed by, shown in the legend. */
export const CATEGORIES: Category[] = [
  { key: 'pome', label: 'Apples & pears', emoji: '🍎', color: '#e2474a' },
  { key: 'citrus', label: 'Citrus', emoji: '🍊', color: '#f2861e' },
  { key: 'stone', label: 'Stone fruit', emoji: '🍑', color: '#ec6f9e' },
  { key: 'berry', label: 'Berries & grapes', emoji: '🫐', color: '#7d4fa0' },
  { key: 'nut', label: 'Nuts', emoji: '🌰', color: '#8a6a3b' },
  { key: 'herb', label: 'Herbs & greens', emoji: '🌿', color: '#5a9e4b' },
  { key: 'fungi', label: 'Mushrooms', emoji: '🍄', color: '#b07a52' },
  { key: 'tropical', label: 'Other fruit', emoji: '🥑', color: '#2f9e8f' },
  { key: 'other', label: 'Other edible', emoji: '🌱', color: '#7f8a99' },
]

const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]))
const OTHER = CATEGORY_BY_KEY.get('other')!

/* First matching rule wins. */
const CATEGORY_RULES: [RegExp, CategoryKey][] = [
  [/citrus|orange|lemon|lime|grapefruit|mandarin|tangerin|clementine|kumquat|yuzu|pomelo|calamondin/i, 'citrus'],
  [/crab\s?apple|\bapple\b|malus|\bpear\b|pyrus|quince|cydonia|hawthorn|crataegus|loquat|medlar|serviceberry|rowan|sorbus/i, 'pome'],
  [/peach|nectarine|apricot|\bplum\b|cherry|prunus|sloe|damson|greengage|almond/i, 'stone'],
  [/berry|berries|rubus|blackberr|raspberr|mulberr|boysenberr|salmonberr|thimbleberr|blueberr|huckleberr|bilberr|strawberr|elderberr|sambucus|currant|gooseberr|ribes|grape|vitis|cranberr/i, 'berry'],
  [/walnut|juglans|chestnut|castanea|hazelnut|filbert|corylus|pecan|hickory|carya|acorn|\boak\b|quercus|pistachio|pine ?nut|pinyon|macadamia|beech|fagus|ginkgo|\bnut\b/i, 'nut'],
  [/mint|mentha|rosemary|sage|salvia|thyme|thymus|basil|oregano|marjoram|lavender|fennel|\bdill\b|parsley|cilantro|coriander|chive|dandelion|nettle|\bherb\b|bay laurel|laurus|nasturtium|mallow|sorrel/i, 'herb'],
  [/mushroom|fungus|fungi|bolet|chanterelle|morel|agaricus|amanita|pleurotus/i, 'fungi'],
  [/\bfig\b|ficus|avocado|persea|mango|banana|plantain|persimmon|diospyros|pomegranate|punica|kiwi|actinidia|guava|passion ?fruit|papaya|pineapple|\bdate\b|jujube|olive|olea|pawpaw|asimina|prickly pear|opuntia|carob/i, 'tropical'],
]

function classify(haystack: string): Category {
  for (const [re, key] of CATEGORY_RULES) {
    if (re.test(haystack)) return CATEGORY_BY_KEY.get(key)!
  }
  return OTHER
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
    const cat = classify(haystack)
    const idx: IndexedType = {
      id: t.id,
      name,
      scientificName,
      emoji: emojiFor(haystack),
      kind: cat.key,
      color: cat.color,
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
