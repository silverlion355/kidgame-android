/**
 * 错题本功能模块
 */

import { navigateTo } from '../core/screen-manager'
import { Storage } from '../core/storage'
import { playSfx } from '../core/audio'
import { loadIdioms, getIdiomById } from '../data/idioms'
import { loadPoems, getPoemById } from '../data/poems'
import { loadEnglish, getEnglishById } from '../data/english'
import { getMathItemById } from '../data/math'
import { toPinyinHtml } from '../shared/pinyin'

export async function initWrongbook(): Promise<void> {
  await renderWrongbook()
  bindEvents()
}

async function renderWrongbook(): Promise<void> {
  const container = document.getElementById('wrongbook-content')
  if (!container) return

  const wb = await Storage.getWrongBook()
  container.innerHTML = ''

  const subjectNames = { idiom: '成语', poem: '古诗', english: '英语', math: '数学' }
  const subjectIcons = { idiom: '📚', poem: '🎋', english: '🔤', math: '✖️' }
  let hasAny = false

  // 预加载数据
  await Promise.all([loadIdioms(), loadPoems(), loadEnglish()])

  for (const subject of ['idiom', 'poem', 'english', 'math'] as const) {
    if (wb[subject].length === 0) continue
    hasAny = true

    const title = document.createElement('h3')
    title.style.cssText = 'margin:16px 0 8px;font-size:16px;color:#3C3C3C;display:flex;align-items:center;gap:8px;'
    title.innerHTML = `<span>${subjectIcons[subject]}</span> ${subjectNames[subject]}（${wb[subject].length}题）`
    container.appendChild(title)

    for (const id of wb[subject]) {
      let item: any = null
      let info = ''

      if (subject === 'idiom') {
        item = getIdiomById(id)
        if (item) info = `${item.word} — ${item.meaning}`
      } else if (subject === 'poem') {
        item = getPoemById(id)
        if (item) info = `《${item.title}》(${item.author})`
      } else if (subject === 'english') {
        item = getEnglishById(id)
        if (item) info = `${item.word} — ${item.meaning_cn}`
      } else if (subject === 'math') {
        item = getMathItemById(id)
        if (item) info = `${item.question} 答案：${item.answer}`
      }

      if (!item) continue

      const div = document.createElement('div')
      div.className = 'wrong-item fade-in'
      div.style.cssText = 'background:white;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);padding:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;border:2px solid #E5E5E5;transition:all 0.2s;'

      let displayInfo = info
      if (subject === 'idiom' || subject === 'poem') {
        displayInfo = toPinyinHtml(info)
      }

      div.innerHTML = `
        <div class="info" style="flex:1;">
          <h4 style="font-size:15px;font-weight:700;margin-bottom:4px;color:#3C3C3C;">${subjectNames[subject]}</h4>
          <p style="font-size:12px;color:#777;line-height:1.4;">${displayInfo}</p>
        </div>
        <button class="remove-btn" data-subject="${subject}" data-id="${id}" style="border:none;background:none;color:#FF4B4B;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:50%;transition:all 0.2s;font-weight:700;">✕</button>
      `

      container.appendChild(div)
    }
  }

  if (!hasAny) {
    container.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:48px 24px;color:#777;">
        <div class="icon" style="font-size:56px;margin-bottom:12px;animation:iconBounce 2s ease-in-out infinite;">📖</div>
        <p style="font-size:14px;">还没有错题哦～<br>继续加油吧！</p>
      </div>
    `
  }

  // 绑定删除按钮
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget as HTMLElement
      const subject = target.dataset.subject as 'idiom' | 'poem' | 'english' | 'math'
      const id = target.dataset.id!
      playSfx('click')
      await Storage.removeWrong(subject, id)
      const itemEl = target.closest('.wrong-item') as HTMLElement | null
      if (itemEl) itemEl.style.opacity = '0'
      setTimeout(() => renderWrongbook(), 300)
    })
  })
}

function bindEvents(): void {
  const backBtn = document.querySelector('#wrongbook-screen .btn-back')
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      playSfx('click')
      navigateTo('home-screen')
    })
  }
}

// 导出
;(window as any).App = {
  ...((window as any).App || {}),
  showWrongBook: () => navigateTo('wrongbook-screen')
}