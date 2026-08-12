/**
 * 主入口 - 应用初始化
 */

import { navigateTo, type ScreenId, initBackHandler, onScreenChange } from './core/screen-manager'
import { initAudio } from './core/audio'
import { preloadAllData } from './core/question-generator'
import { initHome } from './features/home'
import { initQuiz } from './features/quiz'
import { initWrongbook } from './features/wrongbook'
import { initShop } from './features/shop'

// 全局状态
let isInitialized = false

export async function initApp(): Promise<void> {
  if (isInitialized) return

  try {
    console.log('[App] Initializing...')

    // 1. 初始化音频
    await initAudio()

    // 2. 预加载数据（后台进行，不阻塞 UI）
    preloadAllData().catch(e => console.warn('[App] Preload failed:', e))

    // 3. 初始化返回键处理
    initBackHandler()

    // 4. 监听屏幕切换，处理特定页面的初始化
    onScreenChange(async (from, to) => {
      console.log('[App] Screen change:', from, '->', to)

      switch (to) {
        case 'home-screen':
          await initHome()
          break
        case 'levels-screen':
          // 由 home.ts 处理
          break
        case 'quiz-screen':
          initQuiz()
          break
        case 'wrongbook-screen':
          await initWrongbook()
          break
        case 'shop-screen':
          await initShop()
          break
      }
    })

    // 5. 显示首页
    await initHome()

    isInitialized = true
    console.log('[App] Ready!')

  } catch (e) {
    console.error('[App] Init failed:', e)
  }
}

// 导出全局 API（兼容旧代码调用）
;(window as any).App = {
  ...((window as any).App || {}),
  showScreen: navigateTo,
  goHome: () => navigateTo('home-screen'),
  init: initApp
}

// DOM 就绪后初始化
document.addEventListener('DOMContentLoaded', () => {
  initApp()
})

// 导出类型
export type { ScreenId }