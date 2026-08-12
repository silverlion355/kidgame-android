/**
 * 存储层 - 使用 IndexedDB + localStorage 双重保障
 * 解决 APK 升级时数据丢失问题
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { GameProgress, WrongBook, ShopData, DailyRewardResult, Subject } from '../types'

const DB_NAME = 'kidgame-db'
const DB_VERSION = 2

interface KidGameDB extends DBSchema {
  progress: {
    key: string
    value: GameProgress
  }
  wrongBook: {
    key: string
    value: WrongBook
  }
  shop: {
    key: string
    value: ShopData
  }
  settings: {
    key: string
    value: { soundEnabled: boolean; language: string }
  }
  metadata: {
    key: string
    value: { lastMigration: number; version: number }
  }
}

let dbInstance: IDBPDatabase<KidGameDB> | null = null

async function getDB(): Promise<IDBPDatabase<KidGameDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<KidGameDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('progress')
        db.createObjectStore('wrongBook')
        db.createObjectStore('shop')
        db.createObjectStore('settings')
        db.createObjectStore('metadata')
      }
      if (oldVersion < 2) {
        // v2: 添加版本字段用于数据迁移
        db.createObjectStore('metadata')
        // 迁移逻辑在初始化时处理
      }
    }
  })

  return dbInstance
}

const DEFAULT_PROGRESS: GameProgress = {
  idiom: { unlockedLevel: 1, stars: {}, highestLevel: 1 },
  poem: { unlockedLevel: 1, stars: {}, highestLevel: 1 },
  english: { unlockedLevel: 1, stars: {}, highestLevel: 1 },
  math: { unlockedLevel: 1, stars: {}, highestLevel: 1 },
  coins: 0,
  hints: 3,
  lastLoginDate: null,
  streak: 0,
  totalPlayTime: 0,
  version: DB_VERSION
}

const DEFAULT_WRONG_BOOK: WrongBook = { idiom: [], poem: [], english: [], math: [] }
const DEFAULT_SHOP: ShopData = { gifts: [], freeTimeBalance: 0 }

// 通用读写：优先 IndexedDB，降级 localStorage
type StoreName = 'progress' | 'wrongBook' | 'shop' | 'settings' | 'metadata'

const LS_KEY_MAP: Record<StoreName, string> = {
  progress: 'kidgame_progress',
  wrongBook: 'kidgame_wrongBook',
  shop: 'kidgame_shop',
  settings: 'kidgame_settings',
  metadata: 'kidgame_metadata'
}

async function idbGet(store: StoreName, key: string): Promise<unknown> {
  try {
    const db = await getDB()
    return (await db.get(store, key)) ?? null
  } catch {
    // 降级到 localStorage
    try {
      const v = localStorage.getItem(LS_KEY_MAP[store] || `kidgame_${store}`)
      return v ? JSON.parse(v) : null
    } catch {
      return null
    }
  }
}

async function idbSet(store: StoreName, key: string, value: unknown): Promise<boolean> {
  try {
    const db = await getDB()
    await db.put(store, value as never, key)
    return true
  } catch {
    try {
      localStorage.setItem(LS_KEY_MAP[store] || `kidgame_${store}`, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }
}

async function idbDelete(store: StoreName, key: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete(store, key)
  } catch {
    try {
      localStorage.removeItem(LS_KEY_MAP[store] || `kidgame_${store}`)
    } catch {}
  }
}

/**
 * 从 localStorage 迁移数据到 IndexedDB（首次升级时自动执行）
 */
async function migrateFromLocalStorage(): Promise<void> {
  const meta = await idbGet('metadata', 'migration') as { lastMigration?: number } | null
  if (meta?.lastMigration === DB_VERSION) return

  const stores: StoreName[] = ['progress', 'wrongBook', 'shop', 'settings']
  for (const store of stores) {
    const existing = await idbGet(store, store)
    if (!existing) {
      const lsKey = LS_KEY_MAP[store]
      const lsData = localStorage.getItem(lsKey)
      if (lsData) {
        try {
          const parsed = JSON.parse(lsData)
          await idbSet(store, store, parsed)
        } catch {}
      }
    }
  }

  await idbSet('metadata', 'migration', { lastMigration: DB_VERSION, version: DB_VERSION })
}

// 初始化时自动迁移
let migrationPromise: Promise<void> | null = null
function ensureMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = migrateFromLocalStorage()
  }
  return migrationPromise
}

// Simple mutex for atomic operations
const locks = new Map<string, Promise<unknown>>()

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Wait for existing lock
  while (locks.has(key)) {
    await locks.get(key)
  }

  // Create new lock
  const lockPromise = fn().finally(() => {
    locks.delete(key)
  })
  locks.set(key, lockPromise)

  return lockPromise
}

/**
 * 存储管理器 - 统一对外 API
 */
export const Storage = {
  // ========== 进度 ==========
  async getProgress(): Promise<GameProgress> {
    await ensureMigrated()
    const data = await idbGet('progress', 'progress') as GameProgress | null
    if (!data) return { ...DEFAULT_PROGRESS }

    // 确保 math 字段存在（旧版本迁移）
    if (!data.math) {
      data.math = { unlockedLevel: 1, stars: {}, highestLevel: 1 }
    }
    if (!data.version) data.version = DB_VERSION
    if (typeof data.totalPlayTime !== 'number') data.totalPlayTime = 0

    return data
  },

  async saveProgress(progress: GameProgress): Promise<void> {
    await ensureMigrated()
    progress.version = DB_VERSION
    await idbSet('progress', 'progress', progress)
  },

  async saveLevelStars(subject: Subject, level: number, stars: number): Promise<GameProgress> {
    return withLock('progress', async () => {
      const progress = await this.getProgress()
      const prev = progress[subject].stars[level] || 0
      if (stars > prev) {
        progress[subject].stars[level] = stars
      }
      if (level >= progress[subject].highestLevel) {
        progress[subject].highestLevel = level + 1
        progress[subject].unlockedLevel = Math.max(progress[subject].unlockedLevel, level + 1)
      }
      await this.saveProgress(progress)
      return progress
    })
  },

  async addCoins(amount: number): Promise<number> {
    return withLock('progress', async () => {
      const progress = await this.getProgress()
      progress.coins += amount
      await this.saveProgress(progress)
      return progress.coins
    })
  },

  async spendCoins(amount: number): Promise<boolean> {
    return withLock('progress', async () => {
      const progress = await this.getProgress()
      if (progress.coins >= amount) {
        progress.coins -= amount
        await this.saveProgress(progress)
        return true
      }
      return false
    })
  },

  async addTotalPlayTime(seconds: number): Promise<void> {
    return withLock('progress', async () => {
      const progress = await this.getProgress()
      progress.totalPlayTime += seconds
      await this.saveProgress(progress)
    })
  },

  // ========== 错题本 ==========
  async getWrongBook(): Promise<WrongBook> {
    await ensureMigrated()
    const data = await idbGet('wrongBook', 'wrongBook') as WrongBook | null
    return data ?? { ...DEFAULT_WRONG_BOOK }
  },

  async addWrong(subject: Subject, itemId: string): Promise<void> {
    return withLock('wrongBook', async () => {
      await ensureMigrated()
      const wb = await this.getWrongBook()
      if (!wb[subject].includes(itemId)) {
        wb[subject].push(itemId)
        await idbSet('wrongBook', 'wrongBook', wb)
      }
    })
  },

  async removeWrong(subject: Subject, itemId: string): Promise<void> {
    return withLock('wrongBook', async () => {
      await ensureMigrated()
      const wb = await this.getWrongBook()
      wb[subject] = wb[subject].filter(id => id !== itemId)
      await idbSet('wrongBook', 'wrongBook', wb)
    })
  },

  async clearWrongBook(subject?: Subject): Promise<void> {
    return withLock('wrongBook', async () => {
      await ensureMigrated()
      const wb = await this.getWrongBook()
      if (subject) {
        wb[subject] = []
      } else {
        Object.keys(wb).forEach(k => wb[k as Subject] = [])
      }
      await idbSet('wrongBook', 'wrongBook', wb)
    })
  },

  // ========== 登录奖励 ==========
  async checkDailyReward(): Promise<DailyRewardResult> {
    return withLock('progress', async () => {
      await ensureMigrated()
      const progress = await this.getProgress()
      const today = new Date().toDateString()

      if (progress.lastLoginDate !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        if (progress.lastLoginDate === yesterday.toDateString()) {
          progress.streak = (progress.streak || 0) + 1
        } else {
          progress.streak = 1
        }

        const bonusDays = Math.min(progress.streak, 7)
        const coins = 10 + bonusDays * 5
        progress.coins += coins
        progress.lastLoginDate = today
        await this.saveProgress(progress)
        return { claimed: true, coins, streak: progress.streak }
      }

      return { claimed: false, coins: 0, streak: progress.streak || 0 }
    })
  },

  // ========== 提示卡 ==========
  async useHint(): Promise<boolean> {
    return withLock('progress', async () => {
      const progress = await this.getProgress()
      if (progress.hints > 0) {
        progress.hints--
        await this.saveProgress(progress)
        return true
      }
      return false
    })
  },

  async addHints(count: number): Promise<void> {
    return withLock('progress', async () => {
      const progress = await this.getProgress()
      progress.hints += count
      await this.saveProgress(progress)
    })
  },

  // ========== 商店 ==========
  async getShop(): Promise<ShopData> {
    await ensureMigrated()
    const data = await idbGet('shop', 'shop') as ShopData | null
    return data ?? { ...DEFAULT_SHOP }
  },

  async buyGift(giftId: string): Promise<boolean> {
    return withLock('shop', async () => {
      await ensureMigrated()
      const shop = await this.getShop()
      if (!shop.gifts.includes(giftId)) {
        shop.gifts.push(giftId)
        await idbSet('shop', 'shop', shop)
        return true
      }
      return false
    })
  },

  async hasGift(giftId: string): Promise<boolean> {
    const shop = await this.getShop()
    return shop.gifts.includes(giftId)
  },

  async getOwnedGifts(): Promise<string[]> {
    const shop = await this.getShop()
    return [...shop.gifts]
  },

  async addFreeTime(minutes: number): Promise<number> {
    return withLock('shop', async () => {
      await ensureMigrated()
      const shop = await this.getShop()
      shop.freeTimeBalance = (shop.freeTimeBalance || 0) + minutes
      await idbSet('shop', 'shop', shop)
      return shop.freeTimeBalance
    })
  },

  async getFreeTimeBalance(): Promise<number> {
    const shop = await this.getShop()
    return shop.freeTimeBalance || 0
  },

  async useFreeTime(minutes: number): Promise<boolean> {
    return withLock('shop', async () => {
      await ensureMigrated()
      const shop = await this.getShop()
      const balance = shop.freeTimeBalance || 0
      if (minutes > balance) return false
      shop.freeTimeBalance = balance - minutes
      await idbSet('shop', 'shop', shop)
      return true
    })
  },

  // ========== 设置 ==========
  async getSoundEnabled(): Promise<boolean> {
    await ensureMigrated()
    const settings = await idbGet('settings', 'settings') as { soundEnabled?: boolean } | null
    return settings?.soundEnabled ?? true
  },

  async setSoundEnabled(enabled: boolean): Promise<void> {
    return withLock('settings', async () => {
      await ensureMigrated()
      await idbSet('settings', 'settings', { soundEnabled: enabled })
    })
  },

  // ========== 工具 ==========
  async clearAll(): Promise<void> {
    await Promise.all([
      idbDelete('progress', 'progress'),
      idbDelete('wrongBook', 'wrongBook'),
      idbDelete('shop', 'shop'),
      idbDelete('settings', 'settings')
    ])
    // 同时清理 localStorage
    Object.values(LS_KEY_MAP).forEach(key => localStorage.removeItem(key))
  },

  async exportData(): Promise<string> {
    const [progress, wrongBook, shop, settings] = await Promise.all([
      this.getProgress(),
      this.getWrongBook(),
      this.getShop(),
      idbGet('settings', 'settings') as Promise<{ soundEnabled?: boolean } | null>
    ])
    return JSON.stringify({ progress, wrongBook, shop, settings, exportTime: Date.now() }, null, 2)
  },

  async importData(json: string): Promise<boolean> {
    return withLock('progress', async () => {
      try {
        const data = JSON.parse(json)
        if (data.progress) await this.saveProgress(data.progress)
        if (data.wrongBook) await idbSet('wrongBook', 'wrongBook', data.wrongBook)
        if (data.shop) await idbSet('shop', 'shop', data.shop)
        if (data.settings) await idbSet('settings', 'settings', data.settings)
        return true
      } catch {
        return false
      }
    })
  }
}