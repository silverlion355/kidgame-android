import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create hoisted mocks
const { mockDb, localStorageData, localStorageMock } = vi.hoisted(() => {
  const data: Record<string, string> = {}
  return {
    mockDb: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      close: vi.fn(),
    },
    localStorageData: data,
    localStorageMock: {
      getItem: vi.fn((key: string) => data[key] || null),
      setItem: vi.fn((key: string, value: string) => { data[key] = value }),
      removeItem: vi.fn((key: string) => { delete data[key] }),
      clear: vi.fn(() => { Object.keys(data).forEach(k => delete data[k]) }),
      get length() { return Object.keys(data).length },
      key: vi.fn((index: number) => Object.keys(data)[index] || null),
    },
  }
})

// Mock modules
vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue(mockDb),
  DBSchema: {},
  IDBPDatabase: {},
}))

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Import after mocks
import { Storage } from '@/core/storage'

describe('Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageData).forEach(k => delete localStorageData[k])
    mockDb.get.mockReset()
    mockDb.put.mockReset()
    mockDb.delete.mockReset()
  })

  describe('Progress', () => {
    it('should return default progress when no data exists', async () => {
      mockDb.get.mockResolvedValueOnce(undefined)
      localStorageMock.getItem.mockReturnValue(null)
      
      const progress = await Storage.getProgress()
      expect(progress).toEqual({
        idiom: { unlockedLevel: 1, stars: {}, highestLevel: 1 },
        poem: { unlockedLevel: 1, stars: {}, highestLevel: 1 },
        english: { unlockedLevel: 1, stars: {}, highestLevel: 1 },
        math: { unlockedLevel: 1, stars: {}, highestLevel: 1 },
        coins: 0,
        hints: 3,
        lastLoginDate: null,
        streak: 0,
        totalPlayTime: 0,
        version: 2,
      })
    })

    it('should add coins correctly', async () => {
      mockDb.get.mockResolvedValue({ coins: 0 })
      mockDb.put.mockResolvedValue(undefined)
      
      const newCoins = await Storage.addCoins(100)
      expect(newCoins).toBe(100)
      expect(mockDb.put).toHaveBeenCalled()
    })
  })

  describe('WrongBook', () => {
    it('should add and remove wrong items', async () => {
      mockDb.get.mockResolvedValue({ idiom: [], poem: [], english: [], math: [] })
      mockDb.put.mockResolvedValue(undefined)
      
      await Storage.addWrong('idiom', 'idiom_001')
      expect(mockDb.put).toHaveBeenCalled()
      
      mockDb.get.mockResolvedValue({ idiom: ['idiom_001'], poem: [], english: [], math: [] })
      await Storage.removeWrong('idiom', 'idiom_001')
      expect(mockDb.put).toHaveBeenCalled()
    })

    it('should not add duplicate wrong items (put not called)', async () => {
      mockDb.get.mockResolvedValue({ idiom: ['idiom_002'], poem: [], english: [], math: [] })
      mockDb.put.mockResolvedValue(undefined)
      
      await Storage.addWrong('idiom', 'idiom_002')
      // put should NOT be called for duplicates
      expect(mockDb.put).not.toHaveBeenCalled()
    })
  })

  describe('Shop', () => {
    it('should buy and track gifts', async () => {
      mockDb.get.mockResolvedValue({ gifts: [], freeTimeBalance: 0 })
      mockDb.put.mockResolvedValue(undefined)
      
      const result = await Storage.buyGift('gift_001')
      expect(result).toBe(true)
      expect(mockDb.put).toHaveBeenCalled()
    })

    it('should not buy duplicate gifts', async () => {
      mockDb.get.mockResolvedValue({ gifts: ['gift_002'], freeTimeBalance: 0 })
      mockDb.put.mockResolvedValue(undefined)
      
      const result = await Storage.buyGift('gift_002')
      expect(result).toBe(false)
    })

    it('should manage free time balance', async () => {
      mockDb.get.mockResolvedValue({ gifts: [], freeTimeBalance: 0 })
      mockDb.put.mockResolvedValue(undefined)
      
      await Storage.addFreeTime(10)
      expect(mockDb.put).toHaveBeenCalled()
    })
  })

  describe('Daily Reward', () => {
    it('should grant daily reward on first login', async () => {
      mockDb.get.mockResolvedValue({ 
        coins: 0, 
        lastLoginDate: null,
        streak: 0,
      })
      mockDb.put.mockResolvedValue(undefined)
      
      const result = await Storage.checkDailyReward()
      expect(result.claimed).toBe(true)
      expect(result.coins).toBeGreaterThan(0)
      expect(result.streak).toBe(1)
    })
  })

  describe('Settings', () => {
    it('should get and set sound enabled', async () => {
      mockDb.get.mockResolvedValue({ soundEnabled: true })
      
      const enabled = await Storage.getSoundEnabled()
      expect(enabled).toBe(true)
      
      mockDb.put.mockResolvedValue(undefined)
      await Storage.setSoundEnabled(false)
      expect(mockDb.put).toHaveBeenCalledWith('settings', { soundEnabled: false }, 'settings')
    })
  })

  describe('Data Export/Import', () => {
    it('should export and import data', async () => {
      mockDb.get
        .mockResolvedValueOnce({ coins: 500 }) // progress
        .mockResolvedValueOnce({ idiom: ['idiom_001'] }) // wrongbook
        .mockResolvedValueOnce({ gifts: ['gift_001'] }) // shop
        .mockResolvedValueOnce({ soundEnabled: true }) // settings
      
      mockDb.put.mockResolvedValue(undefined)
      
      const exported = await Storage.exportData()
      expect(exported).toContain('500')
      
      const imported = await Storage.importData(exported)
      expect(imported).toBe(true)
    })
  })
})
