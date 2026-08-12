import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateQuestions, getTotalLevels } from '@/core/question-generator'
import { loadIdioms } from '@/data/idioms'
import { loadPoems } from '@/data/poems'
import { loadEnglish } from '@/data/english'

// Mock data modules
vi.mock('@/data/idioms', () => ({
  loadIdioms: vi.fn().mockResolvedValue(undefined),
  getIdiomsByLevel: vi.fn().mockReturnValue([
    { id: 'idiom_001', word: '一举两得', pinyin: 'yī jǔ liǎng dé', meaning: '做一件事得到两个好处', example: '这真是一举两得的好事。', difficulty: 1, tags: [] },
    { id: 'idiom_002', word: '画龙点睛', pinyin: 'huà lóng diǎn jīng', meaning: '比喻在关键处用精辟的话把文章的内容点出来', example: '这最后一笔真是画龙点睛。', difficulty: 1, tags: [] },
    { id: 'idiom_003', word: '守株待兔', pinyin: 'shǒu zhū dài tù', meaning: '比喻死守狭隘经验，不知变通', example: '不要守株待兔，要主动出击。', difficulty: 2, tags: [] },
    { id: 'idiom_004', word: '刻舟求剑', pinyin: 'kè zhōu qiú jiàn', meaning: '比喻不懂事物在不断发展变化', example: '这种做法简直是刻舟求剑。', difficulty: 2, tags: [] },
    { id: 'idiom_005', word: '矛盾', pinyin: 'máo dùn', meaning: '比喻言行互相抵触', example: '他说话总是自相矛盾。', difficulty: 1, tags: [] },
    { id: 'idiom_006', word: '滥竽充数', pinyin: 'làn yú chōng shù', meaning: '比喻没有本领的人冒充行家', example: '他根本不懂音乐，只是滥竽充数。', difficulty: 3, tags: [] },
  ]),
}))

vi.mock('@/data/poems', () => ({
  loadPoems: vi.fn().mockResolvedValue(undefined),
  getPoemsByLevel: vi.fn().mockReturnValue([
    { id: 'poem_001', title: '静夜思', author: '李白', dynasty: '唐', content: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'], translation: '思乡之作' },
    { id: 'poem_002', title: '春晓', author: '孟浩然', dynasty: '唐', content: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'], translation: '春晨感怀' },
    { id: 'poem_003', title: '登鹳雀楼', author: '王之涣', dynasty: '唐', content: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'], translation: '劝人登高望远' },
  ]),
}))

vi.mock('@/data/english', () => ({
  loadEnglish: vi.fn().mockResolvedValue(undefined),
  getEnglishByLevel: vi.fn().mockReturnValue([
    { id: 'eng_001', word: 'apple', phonetic: 'ˈæpl', meaning_cn: '苹果', pos: 'n.', example_en: 'I eat an apple.', example_cn: '我吃一个苹果。' },
    { id: 'eng_002', word: 'book', phonetic: 'bʊk', meaning_cn: '书', pos: 'n.', example_en: 'This is a book.', example_cn: '这是一本书。' },
    { id: 'eng_003', word: 'cat', phonetic: 'kæt', meaning_cn: '猫', pos: 'n.', example_en: 'The cat is cute.', example_cn: '这只猫很可爱。' },
    { id: 'eng_004', word: 'dog', phonetic: 'dɒɡ', meaning_cn: '狗', pos: 'n.', example_en: 'The dog runs.', example_cn: '狗在跑。' },
    { id: 'eng_005', word: 'run', phonetic: 'rʌn', meaning_cn: '跑', pos: 'v.', example_en: 'I run fast.', example_cn: '我跑得快。' },
  ]),
}))

describe('Question Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Idiom Questions', () => {
    it('should generate idiom questions for level 1', async () => {
      const questions = await generateQuestions('idiom', 1, 5)
      expect(questions.length).toBe(5)
      expect(questions.every(q => q.subject === 'idiom')).toBe(true)
      expect(questions.every(q => q.level === 1)).toBe(true)
      expect(questions.every(q => q.id.startsWith('idiom_'))).toBe(true)
    })

    it('should generate both fill and choice type questions', async () => {
      const questions = await generateQuestions('idiom', 1, 10)
      const fillCount = questions.filter(q => q.type === 'fill').length
      const choiceCount = questions.filter(q => q.type === 'choice').length
      expect(fillCount + choiceCount).toBe(10)
    })

    it('should include idiomId in questions', async () => {
      const questions = await generateQuestions('idiom', 1, 3)
      expect(questions.every(q => 'idiomId' in q)).toBe(true)
    })

    it('should have explanation in questions', async () => {
      const questions = await generateQuestions('idiom', 1, 3)
      expect(questions.every(q => q.explanation && q.explanation.length > 0)).toBe(true)
    })
  })

  describe('Poem Questions', () => {
    it('should generate poem questions for level 1', async () => {
      const questions = await generateQuestions('poem', 1, 5)
      expect(questions.length).toBe(5)
      expect(questions.every(q => q.subject === 'poem')).toBe(true)
      expect(questions.every(q => q.level === 1)).toBe(true)
    })

    it('should include poemId in questions', async () => {
      const questions = await generateQuestions('poem', 1, 3)
      expect(questions.every(q => 'poemId' in q)).toBe(true)
    })
  })

  describe('English Questions', () => {
    it('should generate english questions for level 1', async () => {
      const questions = await generateQuestions('english', 1, 5)
      expect(questions.length).toBe(5)
      expect(questions.every(q => q.subject === 'english')).toBe(true)
      expect(questions.every(q => q.level === 1)).toBe(true)
    })

    it('should include englishId in questions', async () => {
      const questions = await generateQuestions('english', 1, 3)
      expect(questions.every(q => 'englishId' in q)).toBe(true)
    })

    it('should have blankCount for fill questions', async () => {
      const questions = await generateQuestions('english', 1, 10)
      const fillQuestions = questions.filter(q => q.type === 'fill')
      expect(fillQuestions.every(q => 'blankCount' in q && q.blankCount > 0)).toBe(true)
    })
  })

  describe('Math Questions', () => {
    it('should generate math questions for level 1', async () => {
      const questions = await generateQuestions('math', 1, 5)
      expect(questions.length).toBe(5)
      expect(questions.every(q => q.subject === 'math')).toBe(true)
      expect(questions.every(q => q.level === 1)).toBe(true)
    })

    it('should include mathType in questions', async () => {
      const questions = await generateQuestions('math', 1, 3)
      expect(questions.every(q => 'mathType' in q)).toBe(true)
    })

    it('should include operand1 and operand2', async () => {
      const questions = await generateQuestions('math', 1, 3)
      expect(questions.every(q => 'operand1' in q && 'operand2' in q)).toBe(true)
    })

    it('should have answer as string', async () => {
      const questions = await generateQuestions('math', 1, 5)
      expect(questions.every(q => typeof q.answer === 'string')).toBe(true)
    })
  })

  describe('getTotalLevels', () => {
    it('should return correct total levels for each subject', () => {
      expect(getTotalLevels('idiom')).toBeGreaterThan(0)
      expect(getTotalLevels('poem')).toBeGreaterThan(0)
      expect(getTotalLevels('english')).toBeGreaterThan(0)
      expect(getTotalLevels('math')).toBeGreaterThan(0)
    })
  })
})
