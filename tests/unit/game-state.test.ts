import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startLevel, selectAnswer, useHint, retryLevel, nextLevel, quitLevel, getState, subscribe, speakCurrentQuestion } from '@/core/game-state'
import { Storage } from '@/core/storage'
import { playSfx, stopSpeaking, speak } from '@/core/audio'
import { generateQuestions } from '@/core/question-generator'
import * as idiomModule from '@/data/idioms'

// Mock dependencies
vi.mock('@/core/storage', () => ({
  Storage: {
    removeWrong: vi.fn().mockResolvedValue(undefined),
    addWrong: vi.fn().mockResolvedValue(undefined),
    addCoins: vi.fn().mockResolvedValue(100),
    saveLevelStars: vi.fn().mockResolvedValue({}),
    addTotalPlayTime: vi.fn().mockResolvedValue(undefined),
    useHint: vi.fn().mockResolvedValue(true),
    getProgress: vi.fn().mockResolvedValue({ hints: 3 }),
  },
}))

vi.mock('@/core/audio', () => ({
  playSfx: vi.fn(),
  speak: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}))

vi.mock('@/core/question-generator', () => ({
  generateQuestions: vi.fn().mockResolvedValue([
    { id: 'q1', type: 'choice', subject: 'idiom', level: 1, question: '测试1', answer: 'A', options: ['A', 'B', 'C', 'D'], idiomId: 'idiom_001' },
    { id: 'q2', type: 'choice', subject: 'idiom', level: 1, question: '测试2', answer: 'B', options: ['A', 'B', 'C', 'D'], idiomId: 'idiom_002' },
    { id: 'q3', type: 'choice', subject: 'idiom', level: 1, question: '测试3', answer: 'C', options: ['A', 'B', 'C', 'D'], idiomId: 'idiom_003' },
    { id: 'q4', type: 'choice', subject: 'idiom', level: 1, question: '测试4', answer: 'D', options: ['A', 'B', 'C', 'D'], idiomId: 'idiom_004' },
    { id: 'q5', type: 'choice', subject: 'idiom', level: 1, question: '测试5', answer: 'A', options: ['A', 'B', 'C', 'D'], idiomId: 'idiom_005' },
  ]),
}))

vi.mock('@/data/idioms', () => ({
  loadIdioms: vi.fn().mockResolvedValue(undefined),
  getIdiomById: vi.fn().mockReturnValue({ 
    id: 'idiom_001', 
    word: '一举两得', 
    pinyin: 'yī jǔ liǎng dé', 
    meaning: '做一件事得到两个好处', 
    example: '这真是一举两得的好事。', 
    difficulty: 1, 
    tags: [] 
  }),
}))

describe('Game State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    quitLevel()
  })

  describe('startLevel', () => {
    it('should initialize game state correctly', async () => {
      const questions = await startLevel('idiom', 1)
      expect(questions.length).toBe(5)
      
      const state = getState()
      expect(state.subject).toBe('idiom')
      expect(state.level).toBe(1)
      expect(state.hearts).toBe(3)
      expect(state.correctCount).toBe(0)
      expect(state.currentIndex).toBe(0)
      expect(state.isActive).toBe(true)
    })

    it('should stop speaking when starting new level', async () => {
      await startLevel('idiom', 1)
      expect(stopSpeaking).toHaveBeenCalled()
    })
  })

  describe('selectAnswer', () => {
    beforeEach(async () => {
      await startLevel('idiom', 1)
    })

    it('should return correct result for correct answer', async () => {
      const result = await selectAnswer('A')
      expect(result.correct).toBe(true)
      expect(result.finished).toBe(false)
      expect(result.nextQuestion).toBeDefined()
    })

    it('should return correct result for wrong answer', async () => {
      const result = await selectAnswer('B')
      expect(result.correct).toBe(false)
      expect(result.finished).toBe(false)
      expect(result.nextQuestion).toBeDefined()
    })

    it('should decrement hearts on wrong answer', async () => {
      const stateBefore = getState()
      const heartsBefore = stateBefore.hearts
      
      await selectAnswer('B')
      
      const stateAfter = getState()
      expect(stateAfter.hearts).toBe(heartsBefore - 1)
    })

    it('should increment correctCount on correct answer', async () => {
      const stateBefore = getState()
      const correctBefore = stateBefore.correctCount
      
      await selectAnswer('A')
      
      const stateAfter = getState()
      expect(stateAfter.correctCount).toBe(correctBefore + 1)
    })

    it('should finish level when hearts reach 0', async () => {
      // Answer wrong 3 times
      await selectAnswer('B')
      await selectAnswer('A') // question 2
      await selectAnswer('A') // question 3
      
      // Check if finished
      const state = getState()
      expect(state.isActive).toBe(false)
    })

    it('should add wrong item to wrongbook on wrong answer', async () => {
      await selectAnswer('B')
      // Current question is q1 (index 0), answer is B (wrong), correct answer is A
      expect(Storage.addWrong).toHaveBeenCalledWith('idiom', 'idiom_001')
    })

    it('should remove wrong item from wrongbook on correct answer', async () => {
      await selectAnswer('A')
      expect(Storage.removeWrong).toHaveBeenCalledWith('idiom', 'idiom_001')
    })
  })

  describe('useHint', () => {
    beforeEach(async () => {
      await startLevel('idiom', 1)
    })

    it('should return success when hint available', async () => {
      const result = await useHint()
      expect(result.success).toBe(true)
      expect(result.removedOption).toBeDefined()
    })

    it('should not allow using hint twice on same question', async () => {
      await useHint()
      const result = await useHint()
      expect(result.success).toBe(false)
    })

    it('should decrement hint count in storage', async () => {
      await useHint()
      expect(Storage.useHint).toHaveBeenCalled()
    })
  })

  describe('retryLevel', () => {
    it('should restart current level', async () => {
      await startLevel('idiom', 1)
      await selectAnswer('B') // wrong answer
      
      const questions = await retryLevel()
      expect(questions.length).toBe(5)
      
      const state = getState()
      expect(state.hearts).toBe(3)
      expect(state.correctCount).toBe(0)
      expect(state.currentIndex).toBe(0)
    })
  })

  describe('nextLevel', () => {
    it('should advance to next level', async () => {
      await startLevel('idiom', 1)
      const questions = await nextLevel()
      
      const state = getState()
      expect(state.level).toBe(2)
      expect(state.hearts).toBe(3)
      expect(state.correctCount).toBe(0)
      expect(state.currentIndex).toBe(0)
    })
  })

  describe('quitLevel', () => {
    it('should reset state to initial', async () => {
      await startLevel('idiom', 1)
      await selectAnswer('A')
      
      quitLevel()
      
      const state = getState()
      expect(state.subject).toBeNull()
      expect(state.level).toBe(1)
      expect(state.questions.length).toBe(0)
      expect(state.isActive).toBe(false)
    })

    it('should stop speaking', async () => {
      await startLevel('idiom', 1)
      quitLevel()
      expect(stopSpeaking).toHaveBeenCalled()
    })
  })

  describe('speakCurrentQuestion', () => {
    it('should speak question for idiom subject', async () => {
      await startLevel('idiom', 1)
      await speakCurrentQuestion()
      expect(speak).toHaveBeenCalled()
    })

    it('should speak question for math subject', async () => {
      const { generateQuestions } = await import('@/core/question-generator')
      generateQuestions.mockResolvedValue([
        { id: 'm1', type: 'choice', subject: 'math', level: 1, question: '2 × 3 = ?', answer: '6', options: ['5', '6', '7', '8'] },
      ])
      
      await startLevel('math', 1)
      await speakCurrentQuestion()
      expect(speak).toHaveBeenCalled()
    })
  })

  describe('subscribe', () => {
    it('should notify subscribers on state change', async () => {
      const listener = vi.fn()
      const unsubscribe = subscribe(listener)
      
      await startLevel('idiom', 1)
      expect(listener).toHaveBeenCalled()
      
      unsubscribe()
      listener.mockClear()
      await startLevel('poem', 1)
      expect(listener).not.toHaveBeenCalled()
    })
  })
})
