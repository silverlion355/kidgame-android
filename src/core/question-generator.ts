/**
 * 题目生成器 - 统一入口，根据科目生成题目
 */

import type { Question, Subject, IdiomQuestion, PoemQuestion, EnglishQuestion, MathQuestion } from '../types'
import { GAME_CONSTANTS, SUBJECT_CONFIGS } from '../types'
import { loadIdioms, getIdiomsByLevel } from '../data/idioms'
import { loadPoems, getPoemsByLevel } from '../data/poems'
import { loadEnglish, getEnglishByLevel } from '../data/english'
import { getRandomMathItem, getMathLevelConfig } from '../data/math'

// 题目缓存，避免同一关卡内重复
const questionCache = new Map<string, Question[]>()

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function pickWrongOptions<T>(correct: string, pool: T[], getText: (t: T) => string, count: number): string[] {
  const wrongs: string[] = []
  const shuffled = shuffleArray(pool)

  for (const item of shuffled) {
    const text = getText(item)
    if (text !== correct && !wrongs.includes(text)) {
      wrongs.push(text)
      if (wrongs.length >= count) break
    }
  }

  // 如果不够，用通用干扰项填充
  const fallbacks = ['未知', '不详', '其他', '暂无']
  for (const fb of fallbacks) {
    if (wrongs.length >= count) break
    if (fb !== correct && !wrongs.includes(fb)) wrongs.push(fb)
  }

  return wrongs.slice(0, count)
}

/**
 * 生成成语题目
 */
async function generateIdiomQuestions(level: number, count: number): Promise<IdiomQuestion[]> {
  await loadIdioms()
  const idioms = getIdiomsByLevel(level)
  const questions: IdiomQuestion[] = []

  for (let i = 0; i < count; i++) {
    const idiom = idioms[Math.floor(Math.random() * idioms.length)]
    if (!idiom) continue

    const questionType = Math.random() < 0.6 ? 'fill' : 'choice'

    if (questionType === 'fill') {
      // 填空题：隐藏 1-2 个字
      const chars = idiom.word.split('')
      const hideCount = chars.length >= 4 ? 2 : 1
      const hideIndices = shuffleArray(chars.map((_, idx) => idx)).slice(0, hideCount)

      let questionText = ''
      chars.forEach((char, idx) => {
        if (hideIndices.includes(idx)) {
          questionText += '{{BLANK:1}}'
        } else {
          questionText += char
        }
      })

      questions.push({
        id: `idiom_${idiom.id}_${Date.now()}_${i}`,
        type: 'fill',
        subject: 'idiom',
        level,
        question: questionText,
        answer: idiom.word,
        idiomId: idiom.id,
        blankCount: hideCount,
        explanation: `${idiom.word} (${idiom.pinyin})：${idiom.meaning}`,
        metadata: { pinyin: idiom.pinyin, meaning: idiom.meaning, example: idiom.example }
      })
    } else {
      // 选择题：给成语，选解释；或给解释，选成语
      const reverse = Math.random() < 0.5

      if (reverse) {
        // 给解释，选成语
        const wrongs = pickWrongOptions(idiom.word, getIdiomsByLevel(level), x => x.word, 3)
        const options = shuffleArray([idiom.word, ...wrongs])

        questions.push({
          id: `idiom_${idiom.id}_${Date.now()}_${i}`,
          type: 'choice',
          subject: 'idiom',
          level,
          question: `下面哪个成语的意思是：「${idiom.meaning}」？`,
          answer: idiom.word,
          options,
          idiomId: idiom.id,
          explanation: `${idiom.word} (${idiom.pinyin})：${idiom.meaning}\n例句：${idiom.example}`
        })
      } else {
        // 给成语，选解释
        const wrongs = pickWrongOptions(idiom.meaning, getIdiomsByLevel(level), x => x.meaning, 3)
        const options = shuffleArray([idiom.meaning, ...wrongs])

        questions.push({
          id: `idiom_${idiom.id}_${Date.now()}_${i}`,
          type: 'choice',
          subject: 'idiom',
          level,
          question: `成语「${idiom.word}」的正确解释是？`,
          answer: idiom.meaning,
          options,
          idiomId: idiom.id,
          explanation: `${idiom.word} (${idiom.pinyin})：${idiom.meaning}\n例句：${idiom.example}`
        })
      }
    }
  }

  return questions
}

/**
 * 生成古诗题目
 */
async function generatePoemQuestions(level: number, count: number): Promise<PoemQuestion[]> {
  await loadPoems()
  const poems = getPoemsByLevel(level)
  const questions: PoemQuestion[] = []

  for (let i = 0; i < count; i++) {
    const poem = poems[Math.floor(Math.random() * poems.length)]
    if (!poem || poem.content.length === 0) continue

    const questionType = Math.random() < 0.5 ? 'fill' : 'choice'

    if (questionType === 'fill') {
      // 填空：随机选一句，隐藏 1-2 个词
      const lineIdx = Math.floor(Math.random() * poem.content.length)
      const line = poem.content[lineIdx]
      const words = line.match(/[一-龥]+/g) || []

      if (words.length === 0) continue

      const hideCount = Math.min(2, words.length)
      const hideWords = shuffleArray(words).slice(0, hideCount)

      let questionText = line
      hideWords.forEach(w => {
        questionText = questionText.replace(w, '{{BLANK:1}}')
      })

      questions.push({
        id: `poem_${poem.id}_${Date.now()}_${i}`,
        type: 'fill',
        subject: 'poem',
        level,
        question: `《${poem.title}》\n${poem.author} (${poem.dynasty})\n\n${questionText}`,
        answer: hideWords.join('，'),
        poemId: poem.id,
        blankCount: hideCount,
        explanation: `《${poem.title}》${poem.author}\n${poem.content.join('\n')}\n${poem.translation || ''}`
      })
    } else {
      // 选择题：给诗句，选诗名/作者/朝代
      const type = Math.floor(Math.random() * 3)

      if (type === 0) {
        // 选诗名
        const lineIdx = Math.floor(Math.random() * poem.content.length)
        const line = poem.content[lineIdx]
        const wrongs = pickWrongOptions(poem.title, getPoemsByLevel(level), x => x.title, 3)
        const options = shuffleArray([poem.title, ...wrongs])

        questions.push({
          id: `poem_${poem.id}_${Date.now()}_${i}`,
          type: 'choice',
          subject: 'poem',
          level,
          question: `「${line}」出自哪首诗？`,
          answer: poem.title,
          options,
          poemId: poem.id,
          explanation: `《${poem.title}》${poem.author} (${poem.dynasty})\n${poem.content.join('\n')}`
        })
      } else if (type === 1) {
        // 选作者
        const wrongs = pickWrongOptions(poem.author, getPoemsByLevel(level), x => x.author, 3)
        const options = shuffleArray([poem.author, ...wrongs])

        questions.push({
          id: `poem_${poem.id}_${Date.now()}_${i}`,
          type: 'choice',
          subject: 'poem',
          level,
          question: `《${poem.title}》的作者是？`,
          answer: poem.author,
          options,
          poemId: poem.id,
          explanation: `《${poem.title}》${poem.author} (${poem.dynasty})`
        })
      } else {
        // 选朝代
        const wrongs = pickWrongOptions(poem.dynasty, getPoemsByLevel(level), x => x.dynasty, 3)
        const options = shuffleArray([poem.dynasty, ...wrongs])

        questions.push({
          id: `poem_${poem.id}_${Date.now()}_${i}`,
          type: 'choice',
          subject: 'poem',
          level,
          question: `《${poem.title}》是哪个朝代的诗？`,
          answer: poem.dynasty,
          options,
          poemId: poem.id,
          explanation: `《${poem.title}》${poem.author} (${poem.dynasty})`
        })
      }
    }
  }

  return questions
}

/**
 * 生成英语题目
 */
async function generateEnglishQuestions(level: number, count: number): Promise<EnglishQuestion[]> {
  await loadEnglish()
  const words = getEnglishByLevel(level)
  const questions: EnglishQuestion[] = []

  for (let i = 0; i < count; i++) {
    const word = words[Math.floor(Math.random() * words.length)]
    if (!word) continue

    const questionType = Math.random() < 0.4 ? 'fill' : 'choice'

    if (questionType === 'fill') {
      // 拼写填空：给中文，写英文
      questions.push({
        id: `eng_${word.id}_${Date.now()}_${i}`,
        type: 'fill',
        subject: 'english',
        level,
        question: `请拼写单词：${word.meaning_cn}`,
        answer: word.word,
        englishId: word.id,
        blankCount: 1,
        explanation: `${word.word} ${word.phonetic ? `/${word.phonetic}/` : ''}\n${word.meaning_cn}\n${word.example_en ? `${word.example_en}\n${word.example_cn}` : ''}`
      })
    } else {
      // 选择题：多种变体
      const variant = Math.floor(Math.random() * 4)

      if (variant === 0) {
        // 中文选英文
        const wrongs = pickWrongOptions(word.word, getEnglishByLevel(level), x => x.word, 3)
        const options = shuffleArray([word.word, ...wrongs])

        questions.push({
          id: `eng_${word.id}_${Date.now()}_${i}`,
          type: 'choice',
          subject: 'english',
          level,
          question: `「${word.meaning_cn}」的英文单词是？`,
          answer: word.word,
          options,
          englishId: word.id,
          explanation: `${word.word} ${word.phonetic ? `/${word.phonetic}/` : ''}\n${word.meaning_cn}`
        })
      } else if (variant === 1) {
        // 英文选中文
        const wrongs = pickWrongOptions(word.meaning_cn, getEnglishByLevel(level), x => x.meaning_cn, 3)
        const options = shuffleArray([word.meaning_cn, ...wrongs])

        questions.push({
          id: `eng_${word.id}_${Date.now()}_${i}`,
          type: 'choice',
          subject: 'english',
          level,
          question: `单词「${word.word}」的意思是？`,
          answer: word.meaning_cn,
          options,
          englishId: word.id,
          explanation: `${word.word} ${word.phonetic ? `/${word.phonetic}/` : ''}\n${word.meaning_cn}`
        })
      } else if (variant === 2 && word.phonetic) {
        // 音标选择
        const wrongs = pickWrongOptions(word.phonetic, getEnglishByLevel(level).filter(x => x.phonetic), x => x.phonetic!, 3)
        const options = shuffleArray([word.phonetic, ...wrongs])

        questions.push({
          id: `eng_${word.id}_${Date.now()}_${i}`,
          type: 'choice',
          subject: 'english',
          level,
          question: `单词「${word.word}」的音标是？`,
          answer: word.phonetic,
          options,
          englishId: word.id,
          explanation: `${word.word} /${word.phonetic}/\n${word.meaning_cn}`
        })
      } else {
        // 词性选择
        const pos = word.pos || 'n.'
        const wrongs = pickWrongOptions(pos, getEnglishByLevel(level).filter(x => x.pos), x => x.pos!, 3)
        const options = shuffleArray([pos, ...wrongs])

        questions.push({
          id: `eng_${word.id}_${Date.now()}_${i}`,
          type: 'choice',
          subject: 'english',
          level,
          question: `单词「${word.word}」的词性是？`,
          answer: pos,
          options,
          englishId: word.id,
          explanation: `${word.word} (${pos}) ${word.meaning_cn}`
        })
      }
    }
  }

  return questions
}

/**
 * 生成数学题目
 */
function generateMathQuestions(level: number, count: number): MathQuestion[] {
  const config = getMathLevelConfig(level)
  const questions: MathQuestion[] = []

  for (let i = 0; i < count; i++) {
    const type = config.types[Math.floor(Math.random() * config.types.length)]
    const item = getRandomMathItem(type, [], config.levelRange)

    // 数学题主要用选择题，偶尔填空
    const isFill = Math.random() < 0.2

    if (isFill) {
      questions.push({
        id: `math_${item.id}_${Date.now()}_${i}`,
        type: 'fill',
        subject: 'math',
        level,
        question: item.question,
        answer: String(item.answer),
        mathType: item.type,
        operand1: item.operand1,
        operand2: item.operand2,
        explanation: `${item.operand1} ${getOperatorSymbol(item.type)} ${item.operand2} = ${item.answer}`
      })
    } else {
      // 生成 3 个干扰项
      const correct = item.answer
      const wrongs: number[] = []

      while (wrongs.length < 3) {
        let wrong: number
        const variance = Math.max(2, Math.floor(correct * 0.2))

        if (item.type === 'multiplication' || item.type === 'division') {
          // 乘法/除法：干扰项为附近的乘积
          const candidates = [correct - variance, correct + variance, correct - 1, correct + 1]
          wrong = candidates[Math.floor(Math.random() * candidates.length)]
        } else {
          // 加减法：+-1 到 +-5
          wrong = correct + (Math.random() < 0.5 ? -1 : 1) * (Math.floor(Math.random() * 5) + 1)
        }

        if (wrong > 0 && wrong !== correct && !wrongs.includes(wrong)) {
          wrongs.push(wrong)
        }
      }

      const options = shuffleArray([String(correct), ...wrongs.map(String)])

      questions.push({
        id: `math_${item.id}_${Date.now()}_${i}`,
        type: 'choice',
        subject: 'math',
        level,
        question: item.question,
        answer: String(correct),
        options,
        mathType: item.type,
        operand1: item.operand1,
        operand2: item.operand2,
        explanation: `${item.operand1} ${getOperatorSymbol(item.type)} ${item.operand2} = ${correct}`
      })
    }
  }

  return questions
}

function getOperatorSymbol(type: MathQuestion['mathType']): string {
  switch (type) {
    case 'multiplication': return '×'
    case 'division': return '÷'
    case 'addition': return '+'
    case 'subtraction': return '-'
  }
}

/**
 * 统一入口：生成指定科目和关卡的题目
 */
export async function generateQuestions(subject: Subject, level: number, count: number = GAME_CONSTANTS.TOTAL_QUESTIONS_PER_LEVEL): Promise<Question[]> {
  const cacheKey = `${subject}_${level}_${count}`

  // 检查缓存（可选，这里不缓存以保证每次新鲜）
  // if (questionCache.has(cacheKey)) return questionCache.get(cacheKey)!

  let questions: Question[]

  switch (subject) {
    case 'idiom':
      questions = await generateIdiomQuestions(level, count)
      break
    case 'poem':
      questions = await generatePoemQuestions(level, count)
      break
    case 'english':
      questions = await generateEnglishQuestions(level, count)
      break
    case 'math':
      questions = generateMathQuestions(level, count)
      break
    default:
      throw new Error(`Unknown subject: ${subject}`)
  }

  // 缓存
  questionCache.set(cacheKey, questions)
  return questions
}

/**
 * 预加载所有科目数据（应用启动时调用）
 */
export async function preloadAllData(): Promise<void> {
  await Promise.all([
    loadIdioms(),
    loadPoems(),
    loadEnglish()
  ])
}

/**
 * 获取科目总关卡数
 */
export function getTotalLevels(subject: Subject): number {
  return SUBJECT_CONFIGS[subject].totalLevels
}

/**
 * 清理题目缓存
 */
export function clearQuestionCache(): void {
  questionCache.clear()
}