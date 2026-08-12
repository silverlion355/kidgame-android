/**
 * 数学题目数据 - 九九乘法表 + 基础运算
 */

export interface MathItem {
  id: string
  type: 'multiplication' | 'addition' | 'subtraction' | 'division'
  operand1: number
  operand2: number
  answer: number
  question: string // 如 "7 × 8 = ?"
  difficulty: number
  level: number // 适合的关卡
}

// 预生成九九乘法表题目
function generateMultiplicationTable(): MathItem[] {
  const items: MathItem[] = []
  let id = 1

  for (let i = 1; i <= 9; i++) {
    for (let j = 1; j <= 9; j++) {
      // 正向：i × j
      items.push({
        id: `math_mul_${id++}`,
        type: 'multiplication',
        operand1: i,
        operand2: j,
        answer: i * j,
        question: `${i} × ${j} = ?`,
        difficulty: Math.ceil((i + j) / 3),
        level: Math.min(9, Math.ceil((i + j) / 2))
      })

      // 反向：j × i (避免重复 1×1, 2×2 等)
      if (i !== j) {
        items.push({
          id: `math_mul_${id++}`,
          type: 'multiplication',
          operand1: j,
          operand2: i,
          answer: j * i,
          question: `${j} × ${i} = ?`,
          difficulty: Math.ceil((i + j) / 3),
          level: Math.min(9, Math.ceil((i + j) / 2))
        })
      }
    }
  }

  return items
}

// 生成加法题目 (1-20)
function generateAddition(): MathItem[] {
  const items: MathItem[] = []
  let id = 1

  for (let i = 1; i <= 20; i++) {
    for (let j = 1; j <= 20; j++) {
      if (i + j <= 20) {
        items.push({
          id: `math_add_${id++}`,
          type: 'addition',
          operand1: i,
          operand2: j,
          answer: i + j,
          question: `${i} + ${j} = ?`,
          difficulty: Math.ceil((i + j) / 8),
          level: Math.min(10, Math.ceil((i + j) / 2))
        })
      }
    }
  }

  return items
}

// 生成减法题目 (1-20)
function generateSubtraction(): MathItem[] {
  const items: MathItem[] = []
  let id = 1

  for (let i = 1; i <= 20; i++) {
    for (let j = 1; j <= i; j++) { // 保证结果非负
      items.push({
        id: `math_sub_${id++}`,
        type: 'subtraction',
        operand1: i,
        operand2: j,
        answer: i - j,
        question: `${i} - ${j} = ?`,
        difficulty: Math.ceil(i / 5),
        level: Math.min(10, Math.ceil(i / 2))
      })
    }
  }

  return items
}

// 生成除法题目 (对应乘法逆运算)
function generateDivision(): MathItem[] {
  const items: MathItem[] = []
  let id = 1

  for (let i = 1; i <= 9; i++) {
    for (let j = 1; j <= 9; j++) {
      const dividend = i * j
      items.push({
        id: `math_div_${id++}`,
        type: 'division',
        operand1: dividend,
        operand2: i,
        answer: j,
        question: `${dividend} ÷ ${i} = ?`,
        difficulty: Math.ceil((i + j) / 3),
        level: Math.min(9, Math.ceil((i + j) / 2))
      })
    }
  }

  return items
}

const _mathCache = {
  multiplication: generateMultiplicationTable(),
  addition: generateAddition(),
  subtraction: generateSubtraction(),
  division: generateDivision()
}

// 合并所有题目
const _allMathItems: MathItem[] = [
  ..._mathCache.multiplication,
  ..._mathCache.addition,
  ..._mathCache.subtraction,
  ..._mathCache.division
]

export function getAllMathItems(): MathItem[] {
  return _allMathItems
}

export function getMathItemsByType(type: MathItem['type']): MathItem[] {
  return _mathCache[type]
}

export function getMathItemsByLevel(level: number): MathItem[] {
  return _allMathItems.filter(item => item.level === level)
}

export function getMathItemsByLevelRange(minLevel: number, maxLevel: number): MathItem[] {
  return _allMathItems.filter(item => item.level >= minLevel && item.level <= maxLevel)
}

export function getRandomMathItem(
  type?: MathItem['type'],
  excludeIds: string[] = [],
  levelRange?: { min: number; max: number }
): MathItem {
  let pool = type ? _mathCache[type] : _allMathItems

  if (levelRange) {
    pool = pool.filter(item => item.level >= levelRange.min && item.level <= levelRange.max)
  }

  const available = pool.filter(item => !excludeIds.includes(item.id))
  if (available.length === 0) {
    // 兜底：返回第一个
    return pool[0]
  }
  return available[Math.floor(Math.random() * available.length)]
}

export function getMathItemById(id: string): MathItem | undefined {
  return _allMathItems.find(item => item.id === id)
}

// 关卡配置：每关包含的运算类型和难度范围
export const MATH_LEVEL_CONFIG: Record<number, { types: MathItem['type'][]; levelRange: { min: number; max: number } }> = {
  1: { types: ['addition'], levelRange: { min: 1, max: 3 } },
  2: { types: ['addition'], levelRange: { min: 2, max: 4 } },
  3: { types: ['addition', 'subtraction'], levelRange: { min: 2, max: 5 } },
  4: { types: ['addition', 'subtraction'], levelRange: { min: 3, max: 6 } },
  5: { types: ['addition', 'subtraction'], levelRange: { min: 4, max: 7 } },
  6: { types: ['addition', 'subtraction', 'multiplication'], levelRange: { min: 1, max: 3 } },
  7: { types: ['addition', 'subtraction', 'multiplication'], levelRange: { min: 2, max: 4 } },
  8: { types: ['multiplication'], levelRange: { min: 2, max: 5 } },
  9: { types: ['multiplication'], levelRange: { min: 3, max: 6 } },
  10: { types: ['multiplication'], levelRange: { min: 4, max: 7 } },
  11: { types: ['multiplication', 'division'], levelRange: { min: 1, max: 4 } },
  12: { types: ['multiplication', 'division'], levelRange: { min: 2, max: 5 } },
  13: { types: ['multiplication', 'division'], levelRange: { min: 3, max: 6 } },
  14: { types: ['multiplication', 'division'], levelRange: { min: 4, max: 7 } },
  15: { types: ['addition', 'subtraction', 'multiplication', 'division'], levelRange: { min: 1, max: 7 } }
}

// 获取关卡配置，超出范围使用混合模式
export function getMathLevelConfig(level: number): { types: MathItem['type'][]; levelRange: { min: number; max: number } } {
  if (MATH_LEVEL_CONFIG[level]) return MATH_LEVEL_CONFIG[level]
  return { types: ['addition', 'subtraction', 'multiplication', 'division'], levelRange: { min: 1, max: 9 } }
}