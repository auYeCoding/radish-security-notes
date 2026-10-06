import type { Readable } from "node:stream";

import type { ImportDialogPort } from "../import/import-ports";

/**
 * 一个文件的状态.
 */
export interface RestoreFileFacts {
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
 * 读取备份文件需要的文件系统能力. 经接口注入, 测试里可以换成替身.
 */
export interface RestoreFilePort {
  /**
   * 读取文件的状态.
   * @param filePath 文件路径.
   * @returns 文件状态, 文件不存在或无法访问时拒绝.
   */
  readonly statFile: (filePath: string) => Promise<RestoreFileFacts>;
  /**
   * 读取文件开头的字节, 用来判断文件的种类.
   * @param filePath 文件路径.
   * @param length 要读取的最大字节数.
   * @returns 文件开头的字节, 文件不足这么长时返回全部, 读取失败时拒绝.
   */
  readonly readHead: (filePath: string, length: number) => Promise<Buffer>;
  /**
   * 打开文件的可读流, 口令加密的备份边读边解密.
   * @param filePath 文件路径.
   * @returns 可读流, 读取失败时以错误结束.
   */
  readonly openStream: (filePath: string) => Readable;
}

/**
 * 恢复依赖的系统对话框: 只用选择文件对话框, 与导入共用同一个端口定义.
 */
export type RestoreDialogPort = Pick<ImportDialogPort, "showOpenDialog">;
