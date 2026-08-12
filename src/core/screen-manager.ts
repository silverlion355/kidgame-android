/**
 * 屏幕管理器 - 单页应用路由
 */

type ScreenId =
  | 'home-screen'
  | 'levels-screen'
  | 'quiz-screen'
  | 'wrongbook-screen'
  | 'shop-screen'

type ScreenChangeCallback = (from: ScreenId | null, to: ScreenId) => void

const callbacks: ScreenChangeCallback[] = []
let currentScreen: ScreenId = 'home-screen'
let previousScreen: ScreenId | null = null

function getScreenElement(id: ScreenId): HTMLElement | null {
  return document.getElementById(id)
}

function hideAllScreens(): void {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active')
  })
}

export function navigateTo(screenId: ScreenId, _options: { replace?: boolean } = {}): void {
  const targetEl = getScreenElement(screenId)
  if (!targetEl) {
    console.error('[ScreenManager] Screen not found:', screenId)
    return
  }

  const fromScreen = currentScreen

  // 离开 quiz-screen 时停止背景音乐
  if (fromScreen === 'quiz-screen' && screenId !== 'quiz-screen') {
    // 由外部调用 stopBgMusic()
  }

  hideAllScreens()
  targetEl.classList.add('active')

  previousScreen = currentScreen
  currentScreen = screenId

  // 触发回调
  callbacks.forEach(cb => {
    try {
      cb(fromScreen, screenId)
    } catch (e) {
      console.error('[ScreenManager] Callback error:', e)
    }
  })

  // 滚动到顶部
  window.scrollTo(0, 0)
}

export function goBack(): void {
  if (previousScreen) {
    navigateTo(previousScreen)
  } else {
    navigateTo('home-screen')
  }
}

export function getCurrentScreen(): ScreenId {
  return currentScreen
}

export function getPreviousScreen(): ScreenId | null {
  return previousScreen
}

export function onScreenChange(cb: ScreenChangeCallback): () => void {
  callbacks.push(cb)
  return () => {
    const idx = callbacks.indexOf(cb)
    if (idx >= 0) callbacks.splice(idx, 1)
  }
}

// 键盘/手势返回支持
export function initBackHandler(): void {
  // Android 物理返回键 / 浏览器返回
  window.addEventListener('popstate', (e) => {
    if (currentScreen !== 'home-screen') {
      e.preventDefault()
      goBack()
    }
  })

  // 推入历史记录以支持返回
  const originalPushState = history.pushState
  history.pushState = function(...args) {
    originalPushState.apply(history, args)
  }
}

// 导出类型
export type { ScreenId, ScreenChangeCallback }