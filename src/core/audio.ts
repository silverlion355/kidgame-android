/**
 * 音频管理器 - Web Audio API + Speech Synthesis
 * 统一管理音效、背景音乐、语音朗读
 */

type SoundType = 'correct' | 'wrong' | 'click' | 'levelup' | 'reward' | 'hint'

interface AudioConfig {
  masterVolume: number
  sfxVolume: number
  musicVolume: number
  soundEnabled: boolean
}

const DEFAULT_CONFIG: AudioConfig = {
  masterVolume: 1.0,
  sfxVolume: 0.8,
  musicVolume: 0.3,
  soundEnabled: true
}

let audioContext: AudioContext | null = null
let config: AudioConfig = { ...DEFAULT_CONFIG }
let bgMusicInterval: number | null = null
let isBgMusicPlaying = false
let currentUtterance: SpeechSynthesisUtterance | null = null
let speakTimeout: number | null = null

// 音效预设
const SFX_PRESETS: Record<SoundType, { frequencies: number[]; type: OscillatorType; duration: number; gain: number }> = {
  correct: { frequencies: [523.25, 659.25, 783.99], type: 'sine', duration: 0.4, gain: 0.3 },
  wrong: { frequencies: [392, 330, 261.63], type: 'sawtooth', duration: 0.5, gain: 0.3 },
  click: { frequencies: [880], type: 'square', duration: 0.1, gain: 0.15 },
  levelup: { frequencies: [523.25, 659.25, 783.99, 1046.5], type: 'sine', duration: 0.8, gain: 0.4 },
  reward: { frequencies: [880, 1108.73, 1318.51, 1760], type: 'triangle', duration: 1.0, gain: 0.35 },
  hint: { frequencies: [659.25, 783.99], type: 'sine', duration: 0.3, gain: 0.25 }
}

// 背景音乐旋律
const BG_MELODY = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]
let bgNoteIndex = 0

function getAudioContext(): AudioContext | null {
  if (!config.soundEnabled) return null
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContext = new AudioContextClass()
    } catch {
      return null
    }
  }
  // 恢复暂停的上下文（浏览器自动暂停策略）
  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }
  return audioContext
}

/**
 * 播放单个音效
 */
export function playSfx(type: SoundType): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const preset = SFX_PRESETS[type]
  const now = ctx.currentTime

  preset.frequencies.forEach((freq, idx) => {
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = preset.type
      osc.frequency.setValueAtTime(freq, now + idx * 0.1)

      gain.gain.setValueAtTime(preset.gain * config.sfxVolume * config.masterVolume, now + idx * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + preset.duration)

      osc.start(now + idx * 0.1)
      osc.stop(now + idx * 0.1 + preset.duration)
    } catch {
      // Ignore oscillator errors
    }
  })
}

/**
 * 播放背景音乐
 */
function playBgNote(): void {
  const ctx = getAudioContext()
  if (!ctx || !isBgMusicPlaying) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(BG_MELODY[bgNoteIndex % BG_MELODY.length], ctx.currentTime)

    gain.gain.setValueAtTime(0.05 * config.musicVolume * config.masterVolume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.2)

    bgNoteIndex++
  } catch {
      // Ignore oscillator errors
    }
}

export function startBgMusic(): void {
  if (isBgMusicPlaying || !config.soundEnabled) return
  isBgMusicPlaying = true
  playBgNote()
  bgMusicInterval = window.setInterval(playBgNote, 1500)
}

export function stopBgMusic(): void {
  isBgMusicPlaying = false
  if (bgMusicInterval) {
    clearInterval(bgMusicInterval)
    bgMusicInterval = null
  }
}

export function toggleBgMusic(enabled: boolean): void {
  if (enabled) startBgMusic()
  else stopBgMusic()
}

/**
 * 语音朗读 - 增强版，支持多语言、超时保护、降级
 */
let voiceList: SpeechSynthesisVoice[] = []
let voicesLoaded = false

function loadVoices(): void {
  try {
    voiceList = window.speechSynthesis.getVoices()
    if (voiceList.length > 0) voicesLoaded = true
  } catch {
      // Ignore oscillator errors
    }
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices
  loadVoices()
}

async function waitForVoices(maxAttempts = 20): Promise<void> {
  if (voicesLoaded && voiceList.length > 0) return

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 100))
    loadVoices()
    if (voicesLoaded && voiceList.length > 0) return
  }
}

function selectVoice(lang: string): SpeechSynthesisVoice | null {
  const prefix = lang.split('-')[0] // 'zh' or 'en'
  return voiceList.find(v => v.lang.startsWith(prefix)) || null
}

export async function speak(
  text: string,
  options: { lang?: string; rate?: number; volume?: number; onEnd?: () => void; onError?: (err: unknown) => void } = {}
): Promise<void> {
  if (!config.soundEnabled || !('speechSynthesis' in window) || !text.trim()) {
    options.onEnd?.()
    return
  }

  const { lang = 'zh-CN', rate = 0.85, volume = 1.0, onEnd, onError } = options

  // 清理之前的
  if (speakTimeout) {
    clearTimeout(speakTimeout)
    speakTimeout = null
  }
  window.speechSynthesis.cancel()
  currentUtterance = null

  await waitForVoices()

  return new Promise(resolve => {
    try {
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = lang
      utter.rate = rate
      utter.volume = volume * config.masterVolume

      const voice = selectVoice(lang)
      if (voice) {
        utter.voice = voice
        // console.log('[Audio] Using voice:', voice.name, voice.lang)
      } else {
        // console.warn('[Audio] No voice found for', lang, 'available:', voiceList.map(v => v.lang))
      }

      let hasStarted = false

      utter.onstart = () => {
        hasStarted = true
        if (speakTimeout) {
          clearTimeout(speakTimeout)
          speakTimeout = null
        }
      }

      utter.onend = () => {
        currentUtterance = null
        onEnd?.()
        resolve()
      }

      utter.onerror = (e) => {
        currentUtterance = null
        console.error('[Audio] Speech error:', e.error)
        // interrupted/canceled 不算错误
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          onError?.(e)
          // 降级：播放提示音
          playSfx('hint')
        }
        resolve()
      }

      currentUtterance = utter

      // 某些浏览器需要 resume
      if (window.speechSynthesis.paused) window.speechSynthesis.resume()
      window.speechSynthesis.speak(utter)

      // 超时保护：3秒未开始播放则重置
      speakTimeout = window.setTimeout(() => {
        if (currentUtterance === utter && !hasStarted) {
          console.warn('[Audio] Speech timeout, canceling')
          try { window.speechSynthesis.cancel() } catch {
      // Ignore oscillator errors
    }
          currentUtterance = null
          speakTimeout = null
          playSfx('hint')
          resolve()
        }
      }, 3000)

    } catch (e) {
      console.error('[Audio] Speech exception:', e)
      currentUtterance = null
      playSfx('hint')
      onError?.(e)
      resolve()
    }
  })
}

export function stopSpeaking(): void {
  if (speakTimeout) {
    clearTimeout(speakTimeout)
    speakTimeout = null
  }
  window.speechSynthesis.cancel()
  currentUtterance = null
}

export function isSpeaking(): boolean {
  return currentUtterance !== null && window.speechSynthesis.speaking
}

/**
 * 配置管理
 */
export function getAudioConfig(): AudioConfig {
  return { ...config }
}

export function setAudioConfig(partial: Partial<AudioConfig>): void {
  config = { ...config, ...partial }
  // 如果关闭总开关，停止所有
  if (!config.soundEnabled) {
    stopBgMusic()
    stopSpeaking()
  }
}

export function setSoundEnabled(enabled: boolean): void {
  config.soundEnabled = enabled
  if (!enabled) {
    stopBgMusic()
    stopSpeaking()
  }
}

export function setMasterVolume(volume: number): void {
  config.masterVolume = Math.max(0, Math.min(1, volume))
}

export function setSfxVolume(volume: number): void {
  config.sfxVolume = Math.max(0, Math.min(1, volume))
}

export function setMusicVolume(volume: number): void {
  config.musicVolume = Math.max(0, Math.min(1, volume))
}

/**
 * 初始化 - 从存储恢复设置
 */
export async function initAudio(savedConfig?: Partial<AudioConfig>): Promise<void> {
  if (savedConfig) {
    config = { ...DEFAULT_CONFIG, ...savedConfig }
  }

  // 预热音频上下文（需要用户交互后）
  await new Promise<void>(resolve => {
    document.addEventListener('click', () => {
      getAudioContext()
      if (config.soundEnabled && !isBgMusicPlaying) {
        startBgMusic()
      }
      resolve()
    }, { once: true })
  })
}