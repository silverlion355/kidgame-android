/**
 * 答题界面功能模块
 */

import { navigateTo } from '../core/screen-manager'
import { Storage } from '../core/storage'
import { playSfx } from '../core/audio'
import { createConfetti } from '../shared/confetti'
import { toPinyinHtml } from '../shared/pinyin'
import { getProgress, selectAnswer, useHint, speakCurrentQuestion, retryLevel, nextLevel, quitLevel, subscribe, type getState } from '../core/game-state'

let currentSubject: 'idiom' | 'poem' | 'english' | 'math' = 'idiom'

export function initQuiz(): void {
  // 订阅游戏状态变化
  subscribe(state => {
    updateQuizUI(state)
  })

  // 绑定事件
  bindEvents()
}

function updateQuizUI(state: ReturnType<typeof getState>): void {
  if (!state.isActive) return

  const question = state.questions[state.currentIndex]
  if (!question) return

  // 更新进度条
  const progressEl = document.getElementById('quiz-progress')
  if (progressEl) {
    progressEl.style.width = `${getProgress() * 100}%`
  }

  // 更新题目
  updateQuestionCard(question)

  // 更新选项
  updateOptions(question)

  // 更新生命值
  updateHearts(state.hearts)

  // 更新提示卡数量
  updateQuizHints()

  // 显示/隐藏朗读按钮
  updateSpeakerButton(question)
}

function updateQuestionCard(question: any): void {
  const card = document.getElementById('question-card')
  const textEl = document.getElementById('question-text')
  if (!card || !textEl) return

  card.classList.remove('fade-in')
  void card.offsetWidth // 触发重绘
  card.classList.add('fade-in')

  let qText = question.question

  // 处理填空题 {{BLANK:n}}
  qText = qText.replace(/{{BLANK:(\d+)}}/g, (_match: string, len: string) => {
    const count = parseInt(len)
    let html = ''
    for (let i = 0; i < count; i++) {
      html += '<span class="tianzi-cell"></span>'
    }
    return html
  })

  // 成语、古诗、英语（中文部分）添加拼音
  if (['idiom', 'poem'].includes(currentSubject)) {
    qText = addPinyinToText(qText)
  } else if (currentSubject === 'english' && /[一-龥]/.test(qText)) {
    qText = addPinyinToText(qText)
  }

  textEl.innerHTML = qText
}

function addPinyinToText(text: string): string {
  // 保护田字格不被处理
  const tianziRegex = /<span class="tianzi-cell"><\/span>/g
  const tianziMatches = text.match(tianziRegex) || []
  let protectedText = text.replace(tianziRegex, '{{TIANZI_PLACEHOLDER}}')

  // 给汉字添加拼音
  protectedText = toPinyinHtml(protectedText)

  // 恢复田字格
  tianziMatches.forEach(t => {
    protectedText = protectedText.replace('{{TIANZI_PLACEHOLDER}}', t)
  })

  return protectedText
}

function updateOptions(question: any): void {
  const container = document.getElementById('options-container')
  if (!container) return

  if (question.type === 'fill') {
    container.style.display = 'none'
    return
  }

  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.innerHTML = ''

  if (!question.options || question.options.length === 0) return

  const labels = ['A', 'B', 'C', 'D']

  // 两列布局
  for (let i = 0; i < question.options.length; i += 2) {
    const rowDiv = document.createElement('div')
    rowDiv.className = 'options-row'
    rowDiv.style.cssText = 'display:flex;gap:10px;'

    // 第一个选项
    const opt1 = question.options[i]
    const btn1 = createOptionButton(labels[i], opt1, opt1 === question.answer, question)
    btn1.style.animationDelay = `${i * 0.1}s`
    rowDiv.appendChild(btn1)

    // 第二个选项
    if (i + 1 < question.options.length) {
      const opt2 = question.options[i + 1]
      const btn2 = createOptionButton(labels[i + 1], opt2, opt2 === question.answer, question)
      btn2.style.animationDelay = `${(i + 1) * 0.1}s`
      rowDiv.appendChild(btn2)
    }

    container.appendChild(rowDiv)
  }
}

function createOptionButton(label: string, text: string, isCorrect: boolean, question: any): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'option-btn slide-in'
  btn.innerHTML = `
    <span class="option-label">${label}</span>
    <span>${text}</span>
  `
  btn.style.cssText = 'flex:1;padding:14px 12px;border:2px solid #E5E5E5;border-radius:16px;background:white;font-size:14px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;font-weight:600;color:#3C3C3C;min-width:0;transition:all 0.15s;'

  btn.onclick = async () => {
    const buttons = document.querySelectorAll('.option-btn')
    buttons.forEach(b => {
      b.classList.add('disabled')
      const span = b.querySelector('span:last-child')
      if (span && span.textContent === question.answer) {
        b.classList.add('correct')
      }
    })

    if (isCorrect) {
      btn.classList.add('correct')
      playSfx('correct')
      const result = await selectAnswer(text)
      handleAnswerResult(result)
    } else {
      btn.classList.add('wrong')
      btn.classList.add('shake')
      playSfx('wrong')
      const result = await selectAnswer(text)
      handleAnswerResult(result)
    }
  }

  return btn
}

async function handleAnswerResult(result: any): Promise<void> {
  if (result.finished) {
    // 关卡结束，显示结果弹窗
    setTimeout(() => showResultModal(result.result), 500)
  } else if (result.nextQuestion) {
    // 延迟进入下一题
    setTimeout(() => {
      // 状态更新会自动触发 UI 更新
    }, isCorrect ? 600 : 800)
  }
}

let isCorrect = false // 临时变量，用于判断延迟时间

function updateHearts(hearts: number): void {
  const container = document.getElementById('hearts')
  if (!container) return
  const MAX_HEARTS = 3
  let html = ''
  for (let i = 0; i < MAX_HEARTS; i++) {
    html += i < hearts ? '❤️' : '🤍'
  }
  container.innerHTML = html
}

async function updateQuizHints(): Promise<void> {
  const progress = await Storage.getProgress()
  const el = document.getElementById('quiz-hints')
  if (el) el.textContent = String(progress.hints)

  const hintBtn = document.getElementById('hint-btn')
  if (hintBtn) {
    (hintBtn as HTMLButtonElement).disabled = progress.hints <= 0
  }
}

function updateSpeakerButton(_question: any): void {
  const btn = document.getElementById('speaker-btn')
  if (!btn) return

  const hasSpeech = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  btn.style.display = hasSpeech ? 'block' : 'none'
}

async function showResultModal(result: any): Promise<void> {
  const modal = document.getElementById('result-modal')
  if (!modal) return

  const titleEl = document.getElementById('result-title')
  const starsEl = document.getElementById('result-stars')
  const msgEl = document.getElementById('result-msg')
  const nextBtn = modal.querySelector('.modal-btn:not(.secondary)') as HTMLElement | null
  const retryBtn = modal.querySelector('.modal-btn.secondary:first-of-type') as HTMLElement | null
  const homeBtn = modal.querySelector('.modal-btn.secondary:last-of-type') as HTMLElement | null

  if (result.success) {
    titleEl!.textContent = '🎉 恭喜过关！'
    starsEl!.textContent = '⭐'.repeat(result.stars) + '☆'.repeat(3 - result.stars)
    msgEl!.textContent = `获得 ${result.coins} 金币！继续加油！`
    if (nextBtn) nextBtn.style.display = ''
    if (retryBtn) retryBtn.style.display = ''
    if (homeBtn) homeBtn.style.display = ''
    createConfetti()
    playSfx('levelup')
  } else {
    titleEl!.textContent = '😢 闯关失败'
    starsEl!.textContent = '💪'
    msgEl!.textContent = '别灰心，再试一次吧！'
    if (nextBtn) nextBtn.style.display = 'none'
    if (retryBtn) retryBtn.style.display = ''
    if (homeBtn) homeBtn.style.display = ''
    playSfx('wrong')
  }

  modal.classList.add('active')
}

function bindEvents(): void {
  // 返回按钮
  const backBtn = document.querySelector('.quiz-header .btn-back')
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      playSfx('click')
      if (confirm('确定要退出吗？当前进度会丢失。')) {
        quitLevel()
        navigateTo('home-screen')
      }
    })
  }

  // 朗读按钮
  const speakerBtn = document.getElementById('speaker-btn')
  if (speakerBtn) {
    speakerBtn.addEventListener('click', () => {
      playSfx('click')
      speakCurrentQuestion()
    })
  }

  // 提示按钮
  const hintBtn = document.getElementById('hint-btn')
  if (hintBtn) {
    hintBtn.addEventListener('click', async () => {
      playSfx('click')
      const result = await useHint()
      if (result.success && result.removedOption) {
        // 视觉反馈：将对应选项变灰
        const buttons = document.querySelectorAll<HTMLButtonElement>('.option-btn')
        buttons.forEach((btn) => {
          const span = btn.querySelector('span:last-child')
          if (span && span.textContent === result.removedOption) {
            btn.style.opacity = '0.3'
            btn.style.pointerEvents = 'none'
            btn.classList.add('disabled')
          }
        })
        await updateQuizHints()
      } else {
        alert('提示卡不足！')
      }
    })
  }

  // 结果弹窗按钮
  const nextBtn = document.querySelector('#result-modal .modal-btn:not(.secondary)') as HTMLElement | null
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      playSfx('click')
      document.getElementById('result-modal')!.classList.remove('active')
      await nextLevel()
    })
  }

  const retryBtn = document.querySelector('#result-modal .modal-btn.secondary:first-of-type') as HTMLElement | null
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      playSfx('click')
      document.getElementById('result-modal')!.classList.remove('active')
      await retryLevel()
    })
  }

  const homeBtn = document.querySelector('#result-modal .modal-btn.secondary:last-of-type') as HTMLElement | null
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      playSfx('click')
      document.getElementById('result-modal')!.classList.remove('active')
      quitLevel()
      navigateTo('home-screen')
    })
  }
}

// 导出给全局调用
;(window as any).App = {
  ...((window as any).App || {}),
  speakQuestion: speakCurrentQuestion,
  useHint,
  retryLevel,
  nextLevel,
  goHome: () => {
    quitLevel()
    navigateTo('home-screen')
  }
}