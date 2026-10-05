/**
 * 导出会话: 只在内存里保留最后一次导出的文件路径, 供 "打开所在文件夹" 使用. 路径不经渲染端, 不写
 * 日志.
 */
export interface ExportSession {
  /**
   * 记住最后一次导出的文件路径.
   * @param filePath 文件路径.
   */
  readonly remember: (filePath: string) => void;
  /**
   * 读取最后一次导出的文件路径.
   * @returns 文件路径, 没有时为 undefined.
   */
  readonly lastPath: () => string | undefined;
  /**
   * 忘掉保留的路径.
   */
  readonly clear: () => void;
}

/**
 * 创建导出会话.
 * @returns 导出会话, 初始没有保留的路径.
 */
export function createExportSession(): ExportSession {
  let path: string | undefined;
  return {
    remember: (filePath) => {
      path = filePath;
    },
    lastPath: () => path,
    clear: () => {
      path = undefined;
    },
  };
}
