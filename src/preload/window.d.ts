import type { RendererApi } from "@shared/ipc/renderer-api";

declare global {
  /**
   * 渲染进程的全局 window 对象, 扩展了 preload 脚本注入的属性.
   */
  interface Window {
    /**
     * preload 脚本暴露的自定义 API.
     */
    api: RendererApi;
  }
}
