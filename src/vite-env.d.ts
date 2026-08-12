// JSON 模块类型声明
declare module '*.json' {
  const value: any
  export default value
}

// 环境变量类型
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 全局 Window 扩展
interface Window {
  App: Record<string, any>
  currentSubject: 'idiom' | 'poem' | 'english' | 'math'
}