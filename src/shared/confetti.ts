/**
 * 彩纸庆祝动画
 */

interface ConfettiOptions {
  particleCount?: number
  colors?: string[]
  duration?: number
  spread?: number
}

const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A29BFE', '#FF8A80', '#80CBC4', '#FDCB6E', '#E17055']

export function createConfetti(options: ConfettiOptions = {}): HTMLElement {
  const {
    particleCount = 50,
    colors = DEFAULT_COLORS,
    duration = 3000,
    spread = 100
  } = options

  const container = document.createElement('div')
  container.className = 'confetti-container'
  container.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 300;
    overflow: hidden;
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes confettiFall {
      0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  `
  document.head.appendChild(style)

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div')
    const size = 6 + Math.random() * 8
    const color = colors[Math.floor(Math.random() * colors.length)]
    const left = Math.random() * spread
    const delay = Math.random() * 1.5

    particle.className = 'confetti'
    particle.style.cssText = `
      position: absolute;
      left: ${left}%;
      top: -20px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      opacity: 0;
      animation: confettiFall ${duration}ms linear forwards;
      animation-delay: ${delay}s;
    `

    container.appendChild(particle)
  }

  document.body.appendChild(container)

  setTimeout(() => {
    container.remove()
    style.remove()
  }, duration + 2000)

  return container
}

/**
 * 创建爆炸效果（从中心向四周）
 */
export function createBurst(x: number, y: number, options: ConfettiOptions = {}): HTMLElement {
  const {
    particleCount = 30,
    colors = DEFAULT_COLORS,
    duration = 2000
  } = options

  const container = document.createElement('div')
  container.className = 'confetti-burst'
  container.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 300;
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes burstExpand {
      0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1) rotate(360deg); opacity: 0; }
    }
  `
  document.head.appendChild(style)

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div')
    const size = 4 + Math.random() * 6
    const color = colors[Math.floor(Math.random() * colors.length)]
    const angle = (Math.PI * 2 * i) / particleCount
    const distance = 50 + Math.random() * 100
    const delay = Math.random() * 0.3

    particle.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
      animation: burstExpand ${duration}ms ease-out forwards;
      animation-delay: ${delay}s;
      --tx: ${Math.cos(angle) * distance}px;
      --ty: ${Math.sin(angle) * distance}px;
    `

    // 添加自定义动画
    const keyframes = `
      @keyframes burstParticle${i} {
        0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
        100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(360deg); opacity: 0; }
      }
    `
    const particleStyle = document.createElement('style')
    particleStyle.textContent = keyframes
    document.head.appendChild(particleStyle)
    particle.style.animationName = `burstParticle${i}`

    container.appendChild(particle)
  }

  document.body.appendChild(container)

  setTimeout(() => {
    container.remove()
    style.remove()
  }, duration + 1000)

  return container
}