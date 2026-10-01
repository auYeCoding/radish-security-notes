import type { ThemeSource } from "@shared/preferences/theme-source";

/**
 * 主题控制器依赖的系统主题接口, Electron 的 `nativeTheme` 满足它,
 * 测试时可换成假实现.
 */
export interface NativeThemePort {
  /**
   * 主题来源, 写入后系统外观与渲染进程的 `prefers-color-scheme` 随之改变.
   */
  themeSource: ThemeSource;
  /**
   * 当前是否使用深色外观.
   */
  readonly shouldUseDarkColors: boolean;
  /**
   * 订阅外观变化事件.
   * @param event 事件名, 只有 updated.
   * @param listener 事件回调.
   * @returns 实现自身, 与 Electron 的事件接口一致.
   */
  on: (event: "updated", listener: () => void) => unknown;
}
