/**
 * 英语单词数据
 */

export interface EnglishItem {
  id: string
  word: string
  phonetic?: string
  meaning_cn: string
  meaning_en?: string
  pos?: string // 词性
  example_en?: string
  example_cn?: string
  difficulty: number
  tags: string[]
  audio_url?: string
}

let _englishCache: EnglishItem[] | null = null

export async function loadEnglish(): Promise<EnglishItem[]> {
  if (_englishCache) return _englishCache

  const module = await import('../data/english.json')
  _englishCache = module.default.items as EnglishItem[]
  return _englishCache!
}

export function getEnglishSync(): EnglishItem[] {
  if (!_englishCache) {
    throw new Error('English not loaded. Call loadEnglish() first.')
  }
  return _englishCache
}

export function getEnglishById(id: string): EnglishItem | undefined {
  return getEnglishSync().find(item => item.id === id)
}

export function getEnglishByLevel(level: number): EnglishItem[] {
  const perLevel = 20
  const start = (level - 1) * perLevel
  const end = start + perLevel
  return getEnglishSync().slice(start, end)
}

export function getRandomEnglish(excludeIds: string[] = []): EnglishItem {
  const available = getEnglishSync().filter(item => !excludeIds.includes(item.id))
  return available[Math.floor(Math.random() * available.length)]
}

export function getEnglishByTag(tag: string): EnglishItem[] {
  return getEnglishSync().filter(item => item.tags.includes(tag))
}