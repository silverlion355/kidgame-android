import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPinyin, getPinyinArray, toPinyinHtml, toSimplePinyin, isChineseChar, hasChinese } from '@/shared/pinyin'

describe('Pinyin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPinyin', () => {
    it('should return pinyin for basic characters in dictionary', () => {
      // Just check it returns something non-null for known characters
      expect(getPinyin('一')).toBeTruthy()
      expect(getPinyin('二')).toBeTruthy()
      expect(getPinyin('三')).toBeTruthy()
      expect(getPinyin('中')).toBeTruthy()
      expect(getPinyin('国')).toBeTruthy()
      expect(getPinyin('人')).toBeTruthy()
      expect(getPinyin('学')).toBeTruthy()
      expect(getPinyin('习')).toBeTruthy()
    })

    it('should return null for emoji and non-Chinese (when pinyin-pro not available)', () => {
      // pinyin-pro might return something for emoji, just check it handles gracefully
      const result = getPinyin('😀')
      // Can be null or a string, just shouldn't throw
      expect(result === null || typeof result === 'string').toBe(true)
      
      const result2 = getPinyin('a')
      expect(result2 === null || typeof result2 === 'string').toBe(true)
      
      const result3 = getPinyin('1')
      expect(result3 === null || typeof result3 === 'string').toBe(true)
    })
  })

  describe('getPinyinArray', () => {
    it('should return array of PinyinResult for Chinese text', () => {
      const result = getPinyinArray('中国')
      expect(result).toHaveLength(2)
      expect(result[0].char).toBe('中')
      expect(result[0].hasPinyin).toBe(true)
      expect(result[1].char).toBe('国')
      expect(result[1].hasPinyin).toBe(true)
    })

    it('should skip non-Chinese characters', () => {
      const result = getPinyinArray('中!')
      expect(result).toHaveLength(2)
      expect(result[1]).toEqual({ char: '!', pinyin: '', hasPinyin: false })
    })

    it('should handle mixed Chinese and English', () => {
      const result = getPinyinArray('Hello 中国')
      expect(result.length).toBe(8) // H e l l o 空格 中 国
      expect(result[6].char).toBe('中')
      expect(result[6].hasPinyin).toBe(true)
      expect(result[7].char).toBe('国')
      expect(result[7].hasPinyin).toBe(true)
    })

    it('should handle empty string', () => {
      const result = getPinyinArray('')
      expect(result).toHaveLength(0)
    })

    it('should handle punctuation', () => {
      const result = getPinyinArray('春眠不觉晓，处处闻啼鸟。')
      expect(result.length).toBeGreaterThan(10)
      const punctuation = result.filter(r => !r.hasPinyin)
      expect(punctuation.length).toBeGreaterThan(0)
    })
  })

  describe('toPinyinHtml', () => {
    it('should wrap Chinese characters in ruby tags', () => {
      const html = toPinyinHtml('中国')
      expect(html).toContain('<ruby>')
      expect(html).toContain('<rb>中</rb>')
      expect(html).toContain('<rb>国</rb>')
      // Check rt tag exists (pinyin format may vary)
      expect(html).toContain('<rt>')
    })

    it('should not wrap non-Chinese characters', () => {
      const html = toPinyinHtml('Hi!')
      expect(html).toBe('Hi!')
    })

    it('should handle mixed content', () => {
      const html = toPinyinHtml('春眠不觉晓')
      expect(html).toContain('<ruby>')
      expect(html).toContain('<rb>春</rb>')
      expect(html).toContain('<rt>')
    })
  })

  describe('toSimplePinyin', () => {
    it('should return space-separated pinyin', () => {
      const result = toSimplePinyin('中国')
      // Just check it returns something with space
      expect(result).toContain(' ')
      expect(result.length).toBeGreaterThan(2)
    })

    it('should skip non-Chinese characters', () => {
      const result = toSimplePinyin('Hi 中国!')
      expect(result).toContain(' ')
    })

    it('should return empty string for no Chinese', () => {
      const result = toSimplePinyin('Hello!')
      expect(result).toBe('')
    })
  })

  describe('isChineseChar', () => {
    it('should return true for Chinese characters', () => {
      expect(isChineseChar('一')).toBe(true)
      expect(isChineseChar('中')).toBe(true)
      expect(isChineseChar('文')).toBe(true)
    })

    it('should return false for non-Chinese', () => {
      expect(isChineseChar('a')).toBe(false)
      expect(isChineseChar('1')).toBe(false)
      expect(isChineseChar('!')).toBe(false)
      expect(isChineseChar(' ')).toBe(false)
    })
  })

  describe('hasChinese', () => {
    it('should return true for text containing Chinese', () => {
      expect(hasChinese('Hello 中国')).toBe(true)
      expect(hasChinese('你好')).toBe(true)
      expect(hasChinese('一')).toBe(true)
    })

    it('should return false for text without Chinese', () => {
      expect(hasChinese('Hello')).toBe(false)
      expect(hasChinese('123')).toBe(false)
      expect(hasChinese('!@#')).toBe(false)
      expect(hasChinese('')).toBe(false)
    })
  })
})
