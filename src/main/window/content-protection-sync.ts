/**
 * 内容保护同步依赖的窗口接口, Electron 的 `BrowserWindow` 满足它.
 */
export interface ProtectableWindow {
  /**
   * 设置是否阻止其它程序抓取窗口内容. Windows 10 2004 及以上把窗口从截屏与录屏里整个排除,
   * 更旧的 Windows 显示为黑块.
   * @param enable 是否启用.
   */
  setContentProtection: (enable: boolean) => void;
}

/**
 * 把内容保护开关同步到全部窗口.
 * @param windows 要同步的窗口.
 * @param isEnabled 是否启用内容保护.
 */
export function applyWindowContentProtection(
  windows: readonly ProtectableWindow[],
  isEnabled: boolean,
): void {
  windows.forEach((window) => window.setContentProtection(isEnabled));
}
