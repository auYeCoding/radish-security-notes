import type { ElectronAPI } from "@electron-toolkit/preload";
import type { RendererApi } from "@shared/ipc/renderer-api";

declare global {
  /**
   * 渲染进程的全局 window 对象, 扩展了 preload 脚本注入的属性.
   */
  interface Window {
    /**
     * Electron 提供的 IPC 与进程信息 API.
     */
    electron: ElectronAPI;
    /**
     * preload 脚本暴露的自定义 API.
     */
    api: RendererApi;
  }
}
