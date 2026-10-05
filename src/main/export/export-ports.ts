import type { Writable } from "node:stream";

/**
 * 弹出保存对话框所需的信息.
 */
export interface ExportSaveDialogRequest {
  /**
   * 对话框标题.
   */
  readonly title: string;
  /**
   * 对话框里预填的完整路径.
   */
  readonly defaultPath: string;
  /**
   * 类型过滤器的显示名称.
   */
  readonly filterName: string;
  /**
   * 类型过滤器允许的扩展名, 不含点号.
   */
  readonly extensions: readonly string[];
}

/**
 * 导出依赖的系统对话框. 经接口注入, 测试里不弹真实的对话框.
 */
export interface ExportDialogPort {
  /**
   * 弹出系统保存对话框.
   * @param request 对话框的预填信息.
   * @returns 用户选定的路径, 取消时为 undefined.
   */
  readonly showSaveDialog: (
    request: ExportSaveDialogRequest,
  ) => Promise<string | undefined>;
}

/**
 * 目标文件同目录里的临时文件: 导出的字节先写进它, 成功后改名成目标文件.
 */
export interface ExportTemporaryFile {
  /**
   * 临时文件的路径.
   */
  readonly path: string;
  /**
   * 写入临时文件的流.
   */
  readonly stream: Writable;
  /**
   * 已写进临时文件的字节数.
   */
  readonly bytesWritten: () => number;
  /**
   * 写完之后调用: 把数据刷到磁盘并关闭文件.
   * @returns 完成后兑现.
   */
  readonly finalize: () => Promise<void>;
  /**
   * 写失败或取消时调用: 关闭文件, 不报错.
   * @returns 完成后兑现.
   */
  readonly abandon: () => Promise<void>;
}

/**
 * 写出导出文件需要的文件系统能力. 经接口注入, 测试里不碰真实的文件.
 */
export interface ExportFilePort {
  /**
   * 在目标文件的同一目录里创建一个临时文件, 独占创建, 只有当前用户可读写.
   * @param targetPath 目标文件的路径.
   * @returns 临时文件, 创建失败时拒绝.
   */
  readonly createTemporaryFile: (
    targetPath: string,
  ) => Promise<ExportTemporaryFile>;
  /**
   * 把临时文件改名成目标文件, 目标已存在时被替换.
   * @param temporaryPath 临时文件的路径.
   * @param targetPath 目标文件的路径.
   * @returns 完成后兑现, 改名失败时拒绝.
   */
  readonly replaceTarget: (
    temporaryPath: string,
    targetPath: string,
  ) => Promise<void>;
  /**
   * 删除一个文件, 文件不存在时不报错.
   * @param filePath 文件路径.
   * @returns 完成后兑现.
   */
  readonly removeFile: (filePath: string) => Promise<void>;
}

/**
 * 导出依赖的系统外壳能力: 在文件管理器里定位文件.
 */
export interface ExportShellPort {
  /**
   * 在系统文件管理器里显示并选中文件.
   * @param filePath 文件路径.
   */
  readonly showItemInFolder: (filePath: string) => void;
}
