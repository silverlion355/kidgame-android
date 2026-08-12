/**
 * 游戏状态管理器 - 答题核心逻辑
 */

import type { Question, Subject, LevelResult } from '../types'
import { GAME_CONSTANTS } from '../types'
import { Storage } from './storage'
import { generateQuestions, getTotalLevels } from './question-generator'
import { playSfx, speak, stopSpeaking } from './audio'

export interface GameState {
  subject: Subject | null
  level: number
  questions: Question[]
  currentIndex: number
  hearts: number
  correctCount: number
  startTime: number
  isActive: boolean
  usedHint: boolean
}

const initialState: GameState = {
  subject: null,
  level: 1,
  questions: [],
  currentIndex: 0,
  hearts: GAME_CONSTANTS.MAX_HEARTS,
  correctCount: 0,
  startTime: 0,
  isActive: false,
  usedHint: false
}

let state = { ...initialState }
let stateListeners: Array<(state: GameState) => void> = []

function notifyListeners(): void {
  stateListeners.forEach(cb => cb({ ...state }))
}

export function subscribe(listener: (state: GameState) => void): () => void {
  stateListeners.push(listener)
  return () => {
    const idx = stateListeners.indexOf(listener)
    if (idx >= 0) stateListeners.splice(idx, 1)
  }
}

export function getState(): Readonly<GameState> {
  return { ...state }
}

/**
 * 开始新关卡
 */
export async function startLevel(subject: Subject, level: number): Promise<Question[]> {
  stopSpeaking()

  state = {
    ...initialState,
    subject,
    level,
    hearts: GAME_CONSTANTS.MAX_HEARTS,
    startTime: Date.now(),
    isActive: true
  }

  state.questions = await generateQuestions(subject, level, GAME_CONSTANTS.TOTAL_QUESTIONS_PER_LEVEL)

  if (state.questions.length === 0) {
    throw new Error(`No questions generated for ${subject} level ${level}`)
  }

  notifyListeners()
  return state.questions
}

/**
 * 获取当前题目
 */
export function getCurrentQuestion(): Question | undefined {
  if (!state.isActive || state.currentIndex >= state.questions.length) return undefined
  return state.questions[state.currentIndex]
}

/**
 * 获取进度 (0-1)
 */
export function getProgress(): number {
  if (state.questions.length === 0) return 0
  return state.currentIndex / state.questions.length
}

/**
 * 选择答案
 */
export async function selectAnswer(chosen: string): Promise<{
  correct: boolean
  finished: boolean
  result?: LevelResult
  nextQuestion?: Question
}> {
  if (!state.isActive) return { correct: false, finished: false }

  const question = getCurrentQuestion()
  if (!question) return { correct: false, finished: true }

  const isCorrect = chosen === question.answer

  if (isCorrect) {
    state.correctCount++
    playSfx('correct')
    // 答对从错题本移除
    const itemId = (question as any).idiomId || (question as any).poemId || (question as any).englishId || (question as any).mathId
    if (itemId) {
      await Storage.removeWrong(state.subject!, itemId)
    }
  } else {
    state.hearts--
    playSfx('wrong')

    // 答错加入错题本
    const itemId = (question as any).idiomId || (question as any).poemId || (question as any).englishId || (question as any).mathId
    if (itemId) {
      await Storage.addWrong(state.subject!, itemId)
    }
  }

  // 检查是否结束
  const isLastQuestion = state.currentIndex >= state.questions.length - 1
  const isFailed = state.hearts <= 0

  if (isLastQuestion || isFailed) {
    return await finishLevel(isFailed)
  }

  // 下一题
  state.currentIndex++
  state.usedHint = false
  notifyListeners()

  return {
    correct: isCorrect,
    finished: false,
    nextQuestion: getCurrentQuestion()
  }
}

/**
 * 使用提示
 */
export async function useHint(): Promise<{ success: boolean; removedOption?: string }> {
  if (!state.isActive || state.usedHint) return { success: false }

  const hintUsed = await Storage.useHint()
  if (!hintUsed) return { success: false }

  const question = getCurrentQuestion()
  if (!question || question.type !== 'choice' || !question.options) return { success: false }

  const wrongOptions = question.options.filter(opt => opt !== question.answer)
  if (wrongOptions.length === 0) return { success: false }

  const removed = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
  state.usedHint = true
  notifyListeners()

  return { success: true, removedOption: removed }
}

/**
 * 完成关卡
 */
async function finishLevel(failed: boolean): Promise<{
  correct: boolean
  finished: true
  result: LevelResult
}> {
  state.isActive = false
  const elapsed = (Date.now() - state.startTime) / 1000

  let stars = 0
  let coins = 0

  if (!failed) {
    const pct = state.correctCount / GAME_CONSTANTS.TOTAL_QUESTIONS_PER_LEVEL
    if (pct >= 1 && elapsed < 60) stars = 3
    else if (pct >= 0.8) stars = 2
    else if (pct >= 0.6) stars = 1
    else stars = 0 // 不及格

    if (stars > 0) {
      coins = stars * GAME_CONSTANTS.BASE_COINS_PER_STAR
      await Storage.addCoins(coins)
      await Storage.saveLevelStars(state.subject!, state.level, stars)
      playSfx('levelup')
    } else {
      failed = true
    }
  } else {
    playSfx('wrong')
  }

  // 记录游戏时长
  await Storage.addTotalPlayTime(Math.floor(elapsed))

  const result: LevelResult = {
    success: !failed,
    stars,
    coins,
    correctCount: state.correctCount,
    totalQuestions: GAME_CONSTANTS.TOTAL_QUESTIONS_PER_LEVEL,
    elapsedSeconds: Math.floor(elapsed)
  }

  notifyListeners()

  return {
    correct: !failed,
    finished: true,
    result
  }
}

/**
 * 重试当前关卡
 */
export async function retryLevel(): Promise<Question[]> {
  return startLevel(state.subject!, state.level)
}

/**
 * 进入下一关
 */
export async function nextLevel(): Promise<Question[]> {
  return startLevel(state.subject!, state.level + 1)
}

/**
 * 退出关卡
 */
export function quitLevel(): void {
  stopSpeaking()
  state = { ...initialState }
  notifyListeners()
}

/**
 * 朗读当前题目
 */
export async function speakCurrentQuestion(): Promise<void> {
  const question = getCurrentQuestion()
  if (!question || !state.subject) return

  let text = ''
  let lang = 'zh-CN'

  switch (state.subject) {
    case 'idiom': {
      const idiomId = (question as any).idiomId
      if (idiomId) {
        const { getIdiomById } = await import('../data/idioms')
        const item = getIdiomById(idiomId)
        if (item) text = item.word
      }
      break
    }
    case 'poem': {
      const poemId = (question as any).poemId
      if (poemId) {
        const { getPoemById } = await import('../data/poems')
        const item = getPoemById(poemId)
        if (item && item.content.length > 0) {
          // 找到包含答案的那句
          text = item.content.find(line => line.includes(question.answer)) || item.content[0]
        }
      }
      break
    }
    case 'english': {
      const englishId = (question as any).englishId
      if (englishId) {
        const { getEnglishById } = await import('../data/english')
        const item = getEnglishById(englishId)
        if (item) text = item.meaning_cn || item.word
        lang = 'zh-CN' // 读中文释义避免英文语音问题
      }
      break
    }
    case 'math': {
      text = question.question.replace('= ?', `等于 ${question.answer}`)
      break
    }
  }

  if (text) {
    await speak(text, { lang })
  }
}

/**
 * 获取科目总关卡数
 */
export function getSubjectTotalLevels(subject: Subject): number {
  return getTotalLevels(subject)
}

/**
 * 检查关卡是否解锁
 */
export async function isLevelUnlocked(subject: Subject, level: number): Promise<boolean> {
  const progress = await Storage.getProgress()
  return level <= progress[subject].unlockedLevel
}