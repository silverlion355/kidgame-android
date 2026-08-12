/**
 * 古诗数据
 */

export interface PoemItem {
  id: string
  title: string
  author: string
  dynasty: string
  content: string[] // 每句一行
  tags: string[]
  difficulty: number
  translation?: string
  appreciation?: string
}

let _poemsCache: PoemItem[] | null = null

export async function loadPoems(): Promise<PoemItem[]> {
  if (_poemsCache) return _poemsCache

  const module = await import('../data/poems.json')
  _poemsCache = module.default.items as PoemItem[]
  return _poemsCache!
}

export function getPoemsSync(): PoemItem[] {
  if (!_poemsCache) {
    throw new Error('Poems not loaded. Call loadPoems() first.')
  }
  return _poemsCache
}

export function getPoemById(id: string): PoemItem | undefined {
  return getPoemsSync().find(item => item.id === id)
}

export function getPoemsByLevel(level: number): PoemItem[] {
  const perLevel = 5
  const start = (level - 1) * perLevel
  const end = start + perLevel
  return getPoemsSync().slice(start, end)
}

export function getRandomPoem(excludeIds: string[] = []): PoemItem {
  const available = getPoemsSync().filter(item => !excludeIds.includes(item.id))
  return available[Math.floor(Math.random() * available.length)]
}