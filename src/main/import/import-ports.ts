/**
 * 一个文件的状态.
 */
export interface ImportFileFacts {
  /**
   * 是否是普通文件, 目录, 设备等不是.
   */
  readonly isFile: boolean;
  /**
   * 文件的字节数.
   */
  readonly size: number;
}

/**
 * 读取来源文件需要的文件系统能力. 经接口注入, 测试里不碰真实的文件.
 */
export interface ImportFilePort {
  /**
   * 读取文件的状态.
   * @param filePath 文件路径.
   * @returns 文件状态, 文件不存在或无法访问时拒绝.
   */
  readonly statFile: (filePath: string) => Promise<ImportFileFacts>;
  /**
   * 读取文件的全部字节.
   * @param filePath 文件路径.
   * @returns 文件内容, 读取失败时拒绝.
   */
  readonly readFile: (filePath: string) => Promise<Buffer>;
}

/**
 * 弹出选择文件对话框所需的信息.
 */
export interface ImportOpenDialogRequest {
  /**
   * 对话框标题.
   */
  readonly title: string;
  /**
   * 对话框默认打开的目录.
   */
  readonly defaultDirectory: string;
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
 * 弹出保存对话框所需的信息.
 */
export interface ImportSaveDialogRequest {
  /**
   * 对话框标题.
   */
  readonly title: string;
  /**
   * 对话框里预填的完整路径.
   */
  readonly defaultPath: string;
}

/**
 * 导入依赖的系统对话框. 经接口注入, 测试里不弹真实的对话框.
 */
export interface ImportDialogPort {
  /**
   * 弹出系统选择文件对话框, 单选.
   * @param request 对话框的预填信息.
   * @returns 用户选定的文件路径, 取消时为 undefined.
   */
  readonly showOpenDialog: (
    request: ImportOpenDialogRequest,
  ) => Promise<string | undefined>;
  /**
   * 弹出系统保存对话框.
   * @param request 对话框的预填信息.
   * @returns 用户选定的路径, 取消时为 undefined.
   */
  readonly showSaveDialog: (
    request: ImportSaveDialogRequest,
  ) => Promise<string | undefined>;
}

/**
 * 写出未能带入清单文本文件需要的文件系统能力.
 */
export interface ImportReportSinkPort {
  /**
   * 把文本按 UTF-8 写成文件.
   * @param filePath 文件路径.
   * @param text 文件内容.
   * @returns 写入完成后兑现, 写入失败时拒绝.
   */
  readonly writeTextFile: (filePath: string, text: string) => Promise<void>;
}

/**
 * 导入依赖的系统外壳能力: 在文件管理器里定位文件.
 */
export interface ImportShellPort {
  /**
   * 在系统文件管理器里显示并选中文件.
   * @param filePath 文件路径.
   */
  readonly showItemInFolder: (filePath: string) => void;
}
