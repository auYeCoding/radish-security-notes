/**
 * 条目服务写剪贴板用的接口, 生产环境由 Electron 的 `clipboard` 满足.
 */
export interface ClipboardPort {
  /**
   * 把文本写入系统剪贴板.
   * @param text 要写入的文本.
   */
  writeText: (text: string) => void;
}
