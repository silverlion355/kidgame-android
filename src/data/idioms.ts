/**
 * 成语数据
 * 从原 JSON 转换为 TS 模块，支持懒加载
 */

export interface IdiomItem {
  id: string
  word: string
  pinyin: string
  meaning: string
  example: string
  difficulty: number
  tags: string[]
}

// 懒加载：只在需要时导入完整数据
let _idiomsCache: IdiomItem[] | null = null

export async function loadIdioms(): Promise<IdiomItem[]> {
  if (_idiomsCache) return _idiomsCache

  // 使用动态导入，Vite 会自动代码分割
  const module = await import('../data/idioms.json')
  _idiomsCache = module.default.items as IdiomItem[]
  return _idiomsCache!
}

export function getIdiomsSync(): IdiomItem[] {
  if (!_idiomsCache) {
    throw new Error('Idioms not loaded. Call loadIdioms() first.')
  }
  return _idiomsCache
}

export function getIdiomById(id: string): IdiomItem | undefined {
  return getIdiomsSync().find(item => item.id === id)
}

export function getIdiomsByDifficulty(difficulty: number): IdiomItem[] {
  return getIdiomsSync().filter(item => item.difficulty === difficulty)
}

export function getIdiomsByLevel(level: number): IdiomItem[] {
  // 每级约 10 个成语，难度递增
  const start = (level - 1) * 10
  const end = start + 10
  return getIdiomsSync().slice(start, end)
}

export function getRandomIdiom(excludeIds: string[] = []): IdiomItem {
  const available = getIdiomsSync().filter(item => !excludeIds.includes(item.id))
  return available[Math.floor(Math.random() * available.length)]
}