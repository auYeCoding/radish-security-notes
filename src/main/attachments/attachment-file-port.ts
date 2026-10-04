/**
 * 弹出系统选择文件对话框所需的信息.
 */
export interface OpenFilesDialogRequest {
  /**
   * 对话框标题.
   */
  readonly title: string;
  /**
   * 对话框默认打开的目录.
   */
  readonly defaultDirectory: string;
}

/**
 * 弹出系统保存对话框所需的信息.
 */
export interface SaveFileDialogRequest {
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
 * 附件依赖的系统对话框. 经接口注入, 测试里不弹真实的对话框.
 */
export interface AttachmentDialogPort {
  /**
   * 弹出系统选择文件对话框, 可多选.
   * @param request 对话框的预填信息.
   * @returns 用户选定的文件路径, 取消或没有选文件时为 undefined.
   */
  readonly showOpenDialog: (
    request: OpenFilesDialogRequest,
  ) => Promise<readonly string[] | undefined>;
  /**
   * 弹出系统保存对话框.
   * @param request 对话框的预填信息.
   * @returns 用户选定的路径, 取消时为 undefined.
   */
  readonly showSaveDialog: (
    request: SaveFileDialogRequest,
  ) => Promise<string | undefined>;
}

/**
 * 一个文件的状态.
 */
export interface AttachmentFileStats {
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
 * 添加附件时读取源文件需要的文件系统能力.
 */
export interface AttachmentSourcePort {
  /**
   * 读取文件的状态.
   * @param filePath 文件路径.
   * @returns 文件状态, 文件不存在或无法访问时拒绝.
   */
  readonly statFile: (filePath: string) => Promise<AttachmentFileStats>;
  /**
   * 读取文件的全部字节.
   * @param filePath 文件路径.
   * @returns 文件内容, 读取失败时拒绝.
   */
  readonly readFile: (filePath: string) => Promise<Buffer>;
}

/**
 * 另存为时写出文件需要的文件系统能力: 先写到临时文件, 再改名到目标路径.
 */
export interface AttachmentSinkPort {
  /**
   * 把字节写成文件.
   * @param filePath 文件路径.
   * @param content 文件内容.
   * @returns 写入完成后兑现.
   */
  readonly writeFile: (filePath: string, content: Buffer) => Promise<void>;
  /**
   * 把文件改名, 目标已存在时覆盖它.
   * @param fromPath 原路径.
   * @param toPath 目标路径.
   * @returns 改名完成后兑现.
   */
  readonly renameFile: (fromPath: string, toPath: string) => Promise<void>;
  /**
   * 删除一个文件, 文件不存在时不报错.
   * @param filePath 文件路径.
   * @returns 删除完成后兑现.
   */
  readonly removeFile: (filePath: string) => Promise<void>;
}

/**
 * 明文临时副本需要的文件系统能力.
 */
export interface TemporaryCopyFileSystemPort {
  /**
   * 创建目录, 上级目录不存在时一并创建.
   * @param directoryPath 目录路径.
   * @returns 创建完成后兑现.
   */
  readonly makeDirectory: (directoryPath: string) => Promise<void>;
  /**
   * 把字节写成文件.
   * @param filePath 文件路径.
   * @param content 文件内容.
   * @returns 写入完成后兑现.
   */
  readonly writeFile: (filePath: string, content: Buffer) => Promise<void>;
  /**
   * 把文件设为只读.
   * @param filePath 文件路径.
   * @returns 设置完成后兑现.
   */
  readonly makeReadOnly: (filePath: string) => Promise<void>;
  /**
   * 同步删除一个目录与其中的全部内容, 目录不存在时不报错; 同步是为了在应用退出时保证删除完成.
   * @param directoryPath 目录路径.
   */
  readonly removeDirectoryTreeSync: (directoryPath: string) => void;
}

/**
 * 附件依赖的系统外壳能力: 用系统默认程序打开文件.
 */
export interface AttachmentShellPort {
  /**
   * 用系统默认程序打开文件.
   * @param filePath 文件路径.
   * @returns 打开失败的说明, 成功时为空串.
   */
  readonly openPath: (filePath: string) => Promise<string>;
}
