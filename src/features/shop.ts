/**
 * 商店功能模块
 */

import { navigateTo } from '../core/screen-manager'
import { Storage } from '../core/storage'
import { playSfx } from '../core/audio'

// 商店礼物数据
interface Gift {
  id: string
  name: string
  icon: string
  price: number
  desc: string
}

function getGiftsData(): Gift[] {
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

export async function initShop(): Promise<void> {
  await renderShop()
  bindEvents()
}

async function renderShop(): Promise<void> {
  await updateShopCoins()
  await updateShopFreeTime()
  await renderGifts()
}

async function updateShopCoins(): Promise<void> {
  const progress = await Storage.getProgress()
  const el = document.getElementById('shop-coins')
  if (el) el.textContent = String(progress.coins)
}

async function updateShopFreeTime(): Promise<void> {
  const balance = await Storage.getFreeTimeBalance()
  const el = document.getElementById('shop-free-time-balance')
  if (el) el.textContent = `余额：${balance} 分钟`

  const useBtn = document.getElementById('use-free-time-btn')
  if (useBtn) useBtn.style.display = balance > 0 ? 'block' : 'none'
}

async function renderGifts(): Promise<void> {
  const container = document.getElementById('shop-items')
  if (!container) return

  const gifts = getGiftsData()
  const owned = await Storage.getOwnedGifts()
  container.innerHTML = ''

  gifts.forEach(gift => {
    const isOwned = owned.includes(gift.id)
    const div = document.createElement('div')
    div.className = 'shop-item' + (isOwned ? ' owned' : '')
    div.style.cssText = 'display:flex;align-items:center;gap:12px;background:white;border-radius:16px;padding:12px 16px;margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;transition:all 0.2s;border:2px solid transparent;'

    if (!isOwned) {
      div.onmouseenter = () => {
        div.style.borderColor = '#1CB0F6'
        div.style.transform = 'translateY(-1px)'
      }
      div.onmouseleave = () => {
        div.style.borderColor = 'transparent'
        div.style.transform = 'translateY(0)'
      }
    }

    div.innerHTML = `
      <div class="shop-item-icon" style="font-size:28px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#F5F5F5;border-radius:10px;flex-shrink:0;">${gift.icon}</div>
      <div class="shop-item-info" style="flex:1;">
        <h4 style="font-size:15px;margin:0 0 2px;">${gift.name}</h4>
        <p style="font-size:12px;color:#777;margin:0;">${gift.desc}</p>
      </div>
      <div class="shop-item-price" style="font-weight:700;color:#F39C12;font-size:14px;flex-shrink:0;">
        ${isOwned ? '<span class="owned-badge" style="background:#D7FFB8;color:#37A302;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">已拥有</span>' : gift.price + ' 🪙'}
      </div>
    `

    if (!isOwned) {
      div.onclick = () => buyGift(gift.id)
    }

    container.appendChild(div)
  })
}

async function buyFreeTime(): Promise<void> {
  if (!confirm('确认花费 100 🪙 兑换 1 分钟休闲时间吗？')) return

  const success = await Storage.spendCoins(100)
  if (success) {
    await Storage.addFreeTime(1)
    await updateShopCoins()
    await updateShopFreeTime()
    alert('兑换成功！获得1分钟休闲时间 🎉')
    playSfx('reward')
  } else {
    alert('金币不足！需要100金币才能兑换1分钟休闲时间。')
    playSfx('wrong')
  }
}

async function buyGift(giftId: string): Promise<void> {
  const gifts = getGiftsData()
  const gift = gifts.find(g => g.id === giftId)
  if (!gift) return

  if (await Storage.hasGift(giftId)) {
    alert('你已经拥有这个礼物了！')
    return
  }

  if (!confirm(`确认花费 ${gift.price} 🪙 购买 ${gift.icon} ${gift.name} 吗？`)) return

  if (await Storage.spendCoins(gift.price)) {
    await Storage.buyGift(giftId)
    await updateShopCoins()
    await renderGifts()
    // 更新首页礼物展示
    updateGiftsDisplay()
    alert(`购买成功！获得 ${gift.icon} ${gift.name} 🎉`)
    playSfx('reward')
  } else {
    alert(`金币不足！${gift.name}需要 ${gift.price} 金币。`)
    playSfx('wrong')
  }
}

function showUseFreeTimeModal(): void {
  Storage.getFreeTimeBalance().then(balance => {
    if (balance <= 0) {
      alert('没有可用的休闲时间！')
      return
    }

    const modal = document.getElementById('use-free-time-modal')
    const balEl = document.getElementById('modal-balance')
    const input = document.getElementById('use-minutes-input')

    if (balEl) balEl.textContent = String(balance)
    if (input) (input as HTMLInputElement).value = ''
    if (modal) {
      modal.classList.add('active')
    }
  })
}

function closeUseFreeTimeModal(): void {
  const modal = document.getElementById('use-free-time-modal')
  if (modal) {
    modal.classList.remove('active')
  }
}

async function confirmUseFreeTime(): Promise<void> {
  const input = document.getElementById('use-minutes-input') as HTMLInputElement
  const minutes = parseInt(input?.value || '0') || 0
  const balance = await Storage.getFreeTimeBalance()

  if (minutes <= 0) {
    alert('请输入有效的分钟数！')
    return
  }
  if (minutes > balance) {
    alert(`余额不足！当前余额：${balance} 分钟`)
    return
  }

  if (await Storage.useFreeTime(minutes)) {
    closeUseFreeTimeModal()
    await updateShopFreeTime()
    updateFreeTimeDisplay()
    alert(`已使用 ${minutes} 分钟休闲时间！⏰`)
    playSfx('click')
  }
}

function useFreeTimeQuick(minutes: number): void {
  Storage.getFreeTimeBalance().then(async balance => {
    if (minutes === 999) minutes = balance // "全部"按钮
    if (minutes > balance) {
      alert(`余额不足！当前余额：${balance} 分钟`)
      return
    }
    if (await Storage.useFreeTime(minutes)) {
      closeUseFreeTimeModal()
      await updateShopFreeTime()
      updateFreeTimeDisplay()
      alert(`已使用 ${minutes} 分钟休闲时间！⏰`)
      playSfx('click')
    }
  })
}

async function updateFreeTimeDisplay(): Promise<void> {
  const el = document.getElementById('free-time-display')
  if (!el) return
  const balance = await Storage.getFreeTimeBalance()
  if (balance > 0) {
    el.textContent = `⏰ ${balance}分钟`
    el.style.display = 'block'
  } else {
    el.style.display = 'none'
  }
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

function bindEvents(): void {
  // 返回按钮
  const backBtn = document.querySelector('#shop-screen .btn-back')
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      playSfx('click')
      navigateTo('home-screen')
    })
  }

  // 购买休闲时间
  const freeTimeBtn = document.querySelector('.shop-item[onclick*="buyFreeTime"]')
  if (freeTimeBtn) {
    freeTimeBtn.addEventListener('click', () => {
      playSfx('click')
      buyFreeTime()
    })
  }

  // 使用休闲时间按钮
  const useFreeTimeBtn = document.getElementById('use-free-time-btn')
  if (useFreeTimeBtn) {
    useFreeTimeBtn.addEventListener('click', () => {
      playSfx('click')
      showUseFreeTimeModal()
    })
  }

  // 休闲时间弹窗
  const closeModalBtn = document.querySelector('#use-free-time-modal .modal-btn.secondary')
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      playSfx('click')
      closeUseFreeTimeModal()
    })
  }

  const confirmModalBtn = document.querySelector('#use-free-time-modal .modal-btn:not(.secondary)')
  if (confirmModalBtn) {
    confirmModalBtn.addEventListener('click', () => {
      playSfx('click')
      confirmUseFreeTime()
    })
  }

  // 快捷使用按钮
  document.querySelectorAll('#use-free-time-modal .modal-btn[onclick*="useFreeTimeQuick"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      playSfx('click')
      const onclick = (e.currentTarget as HTMLElement).getAttribute('onclick')
      const match = onclick?.match(/useFreeTimeQuick\((\d+)\)/)
      if (match) useFreeTimeQuick(parseInt(match[1]))
    })
  })
}

// 导出
;(window as any).App = {
  ...((window as any).App || {}),
  showShop: () => navigateTo('shop-screen'),
  hideShop: () => navigateTo('home-screen'),
  buyFreeTime,
  showUseFreeTimeModal,
  closeUseFreeTimeModal,
  confirmUseFreeTime,
  useFreeTimeQuick,
  buyGift
}