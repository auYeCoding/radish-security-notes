import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  /**
   * 渲染进程的全局 window 对象, 扩展了 preload 脚本注入的属性.
   */
  interface Window {
    /**
     * Electron 提供的 IPC 与进程信息 API.
     */
    electron: ElectronAPI
    /**
     * preload 脚本暴露的自定义 API.
     */
    api: unknown
  }
}
