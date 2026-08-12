/**
 * 首页功能模块
 */

import { navigateTo } from '../core/screen-manager'
import { Storage } from '../core/storage'
import { SUBJECT_CONFIGS } from '../types'
import { playSfx, startBgMusic, initAudio, setSoundEnabled, getAudioConfig } from '../core/audio'
import { startLevel } from '../core/game-state'

let soundEnabled = true

export async function initHome(): Promise<void> {
  // 初始化音频
  await initAudio()
  soundEnabled = getAudioConfig().soundEnabled
  updateSoundButton()

  // 更新UI
  await updateHomeUI()

  // 检查每日奖励
  await checkDailyReward()

  // 启动背景音乐
  startBgMusic()

  // 绑定事件
  bindEvents()
}

async function updateHomeUI(): Promise<void> {
  const progress = await Storage.getProgress()

  // 金币、提示卡
  setText('home-coins', progress.coins)
  setText('home-hints', progress.hints)

  // 休闲时间
  updateFreeTimeDisplay()

  // 三科目进度
  for (const subject of ['idiom', 'poem', 'english', 'math'] as const) {
    const subProgress = progress[subject]
    const stars = Object.values(subProgress.stars).reduce((a, b) => a + b, 0)
    const starStr = renderStars(stars, subProgress.highestLevel * 3)
    setText(`${subject}-stars`, starStr)
    setText(`${subject}-level`, `第${subProgress.highestLevel}关`)
  }

  // 更新礼物展示
  updateGiftsDisplay()
}

function renderStars(count: number, max: number): string {
  const displayCount = Math.min(5, max)
  let s = ''
  for (let i = 0; i < displayCount; i++) {
    s += i < count ? '⭐' : '☆'
  }
  return s
}

function setText(id: string, value: string | number): void {
  const el = document.getElementById(id)
  if (el) el.textContent = String(value)
}

function updateFreeTimeDisplay(): void {
  const el = document.getElementById('free-time-display')
  if (!el) return

  Storage.getFreeTimeBalance().then(balance => {
    if (balance > 0) {
      el.textContent = `⏰ ${balance}分钟`
      el.style.display = 'block'
    } else {
      el.style.display = 'none'
    }
  })
}

async function updateGiftsDisplay(): Promise<void> {
  const container = document.getElementById('gifts-display')
  if (!container) return

  const owned = await Storage.getOwnedGifts()
  if (!owned.length) {
    container.innerHTML = ''
    return
  }

  const gifts = getGiftsData()
  container.innerHTML = '<h3 style="margin:12px 0 8px;font-size:14px;color:#777;">我的礼物 🎁</h3>'
  const wrap = document.createElement('div')
  wrap.className = 'gifts-wrap'
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:8px 0;'

  owned.forEach(id => {
    const gift = gifts.find(g => g.id === id)
    if (!gift) return
    const span = document.createElement('span')
    span.className = 'gift-icon'
    span.textContent = gift.icon
    span.title = gift.name
    span.style.cssText = 'font-size:28px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#FFF3E0;border-radius:10px;cursor:pointer;border:2px solid #FFE0B2;transition:transform 0.2s;'
    span.onmouseenter = () => span.style.transform = 'scale(1.1)'
    span.onmouseleave = () => span.style.transform = 'scale(1)'
    wrap.appendChild(span)
  })

  container.appendChild(wrap)
}

function getGiftsData() {
  return [
    { id: 'gift_001', name: '小星星', icon: '⭐', price: 50, desc: '闪闪发光的小星星' },
    { id: 'gift_002', name: '小花朵', icon: '🌸', price: 80, desc: '一朵美丽的花朵' },
    { id: 'gift_003', name: '小皇冠', icon: '👑', price: 120, desc: '小小国王的皇冠' },
    { id: 'gift_004', name: '小火箭', icon: '🚀', price: 150, desc: '嗖——飞上天啦' },
    { id: 'gift_005', name: '小蛋糕', icon: '🎂', price: 100, desc: '香甜可口的小蛋糕' },
    { id: 'gift_006', name: '小气球', icon: '🎈', price: 60, desc: '五颜六色的小气球' },
    { id: 'gift_007', name: '小奖杯', icon: '🏆', price: 200, desc: '你是第一名！' },
    { id: 'gift_008', name: '小礼物盒', icon: '🎁', price: 180, desc: '里面藏着惊喜哦' },
    { id: 'gift_009', name: '小彩虹', icon: '🌈', price: 160, desc: '雨后的美丽彩虹' },
    { id: 'gift_010', name: '小月亮', icon: '🌙', price: 140, desc: '晚上陪你睡觉' }
  ]
}

async function checkDailyReward(): Promise<void> {
  const result = await Storage.checkDailyReward()
  if (result.claimed) {
    const popup = document.getElementById('reward-popup')
    const textEl = document.getElementById('reward-text')
    if (popup && textEl) {
      textEl.textContent = `获得 ${result.coins} 金币（连续登录 ${result.streak} 天）`
      popup.classList.add('active')
      playSfx('reward')
    }
  }
}

function bindEvents(): void {
  // 音效开关
  const soundBtn = document.getElementById('sound-toggle')
  if (soundBtn) {
    soundBtn.onclick = toggleSound
  }

  // 关闭奖励弹窗
  const closeRewardBtn = document.querySelector('.reward-popup .modal-btn')
  if (closeRewardBtn) {
    closeRewardBtn.addEventListener('click', closeReward)
  }

  // 科目卡片点击
  document.querySelectorAll('.subject-card[data-subject]').forEach(card => {
    card.addEventListener('click', () => {
      const subject = card.getAttribute('data-subject') as 'idiom' | 'poem' | 'english' | 'math'
      if (subject) {
        playSfx('click')
        navigateToSubject(subject)
      }
    })
  })

  // 错题本、商店
  const wrongbookCard = document.querySelector('.subject-card[data-action="wrongbook"]')
  if (wrongbookCard) wrongbookCard.addEventListener('click', () => { playSfx('click'); navigateTo('wrongbook-screen') })

  const shopCard = document.querySelector('.subject-card[data-action="shop"]')
  if (shopCard) shopCard.addEventListener('click', () => { playSfx('click'); navigateTo('shop-screen') })
}

function toggleSound(): void {
  soundEnabled = !soundEnabled
  setSoundEnabled(soundEnabled)
  updateSoundButton()
  if (soundEnabled) startBgMusic()
}

function updateSoundButton(): void {
  const btn = document.getElementById('sound-toggle')
  if (btn) {
    btn.textContent = soundEnabled ? '🔊' : '🔇'
    btn.classList.toggle('muted', !soundEnabled)
  }
}

function closeReward(): void {
  const popup = document.getElementById('reward-popup')
  if (popup) {
    popup.classList.remove('active')
    updateHomeUI()
  }
}

function navigateToSubject(subject: 'idiom' | 'poem' | 'english' | 'math'): void {
  const config = SUBJECT_CONFIGS[subject]
  const titleEl = document.getElementById('levels-title')
  if (titleEl) {
    titleEl.textContent = `${config.name}（共${config.totalLevels}关）`
  }
  // 存储当前科目到全局状态（由游戏状态管理器处理）
  ;(window as any).currentSubject = subject
  renderLevelGrid(subject)
  navigateTo('levels-screen')
}

async function renderLevelGrid(subject: 'idiom' | 'poem' | 'english' | 'math'): Promise<void> {
  const progress = await Storage.getProgress()
  const subProgress = progress[subject]
  const unlocked = subProgress.unlockedLevel || 1
  const stars = subProgress.stars || {}
  const config = SUBJECT_CONFIGS[subject]
  const grid = document.getElementById('levels-grid')
  if (!grid) return

  grid.innerHTML = ''

  for (let i = 1; i <= config.totalLevels; i++) {
    const btn = document.createElement('button')
    btn.className = 'level-btn'
    const starCount = stars[i] || 0
    const starStr = '⭐'.repeat(starCount) + '☆'.repeat(3 - starCount)

    if (i > unlocked) {
      btn.classList.add('locked')
      btn.innerHTML = '<span class="lock-icon">🔒</span>'
    } else {
      if (starCount > 0) btn.classList.add('completed')
      if (i === unlocked && starCount === 0) btn.classList.add('current')
      btn.innerHTML = `<span>${i}</span><span class="level-stars">${starStr}</span>`
      btn.onclick = () => {
        playSfx('click')
        startLevel(subject, i)
      }
    }
    grid.appendChild(btn)
  }
}

// 导出给全局调用（临时，后续由路由管理）
;(window as any).App = {
  ...((window as any).App || {}),
  toggleSound,
  closeReward,
  goToLevels: navigateToSubject,
  showScreen: navigateTo
}