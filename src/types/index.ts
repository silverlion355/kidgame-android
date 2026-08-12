/**
 * 核心类型定义
 */

export type Subject = 'idiom' | 'poem' | 'english' | 'math'

export type Difficulty = 1 | 2 | 3 | 4 | 5

export interface BaseQuestion {
  id: string
  type: 'choice' | 'fill' | 'match' | 'speak' | 'write'
  subject: Subject
  level: number
  question: string
  answer: string
  options?: string[]
  explanation?: string
  metadata?: Record<string, unknown>
}

export interface IdiomQuestion extends BaseQuestion {
  subject: 'idiom'
  idiomId: string
  blankCount?: number
}

export interface PoemQuestion extends BaseQuestion {
  subject: 'poem'
  poemId: string
  blankCount?: number
}

export interface EnglishQuestion extends BaseQuestion {
  subject: 'english'
  englishId: string
  word?: string
  meaning?: string
  phonetic?: string
  blankCount?: number
}

export interface MathQuestion extends BaseQuestion {
  subject: 'math'
  mathType: 'multiplication' | 'addition' | 'subtraction' | 'division'
  operand1: number
  operand2: number
}

export type Question = IdiomQuestion | PoemQuestion | EnglishQuestion | MathQuestion

export interface SubjectProgress {
  unlockedLevel: number
  stars: Record<number, number> // level -> stars (1-3)
  highestLevel: number
}

export interface GameProgress {
  idiom: SubjectProgress
  poem: SubjectProgress
  english: SubjectProgress
  math: SubjectProgress
  coins: number
  hints: number
  lastLoginDate: string | null
  streak: number
  totalPlayTime: number
  version: number // 数据版本，用于迁移
}

export interface WrongBook {
  idiom: string[]
  poem: string[]
  english: string[]
  math: string[]
}

export interface ShopData {
  gifts: string[]
  freeTimeBalance: number
}

export interface DailyRewardResult {
  claimed: boolean
  coins: number
  streak: number
}

export interface LevelResult {
  success: boolean
  stars: number
  coins: number
  correctCount: number
  totalQuestions: number
  elapsedSeconds: number
}

export interface SubjectConfig {
  key: Subject
  name: string
  icon: string
  color: string
  totalLevels: number
  questionsPerLevel: number
}

export const SUBJECT_CONFIGS: Record<Subject, SubjectConfig> = {
  idiom: {
    key: 'idiom',
    name: '成语乐园',
    icon: '📚',
    color: '#FF6B6B',
    totalLevels: 100,
    questionsPerLevel: 5
  },
  poem: {
    key: 'poem',
    name: '古诗天地',
    icon: '🎋',
    color: '#4ECDC4',
    totalLevels: 80,
    questionsPerLevel: 5
  },
  english: {
    key: 'english',
    name: '英语世界',
    icon: '🔤',
    color: '#45B7D1',
    totalLevels: 120,
    questionsPerLevel: 5
  },
  math: {
    key: 'math',
    name: '数学星球',
    icon: '✖️',
    color: '#96CEB4',
    totalLevels: 50,
    questionsPerLevel: 5
  }
}

export const GAME_CONSTANTS = {
  TOTAL_QUESTIONS_PER_LEVEL: 5,
  MAX_HEARTS: 3,
  BASE_COINS_PER_STAR: 10,
  HINT_COST: 1,
  FREE_TIME_COST: 100, // 1分钟 = 100金币
  DAILY_BASE_COINS: 10,
  DAILY_STREAK_BONUS: 5,
  MAX_STREAK_BONUS_DAYS: 7
} as const