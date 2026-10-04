import { resolve } from "node:path";

import { vi } from "vitest";

import type {
  AttachmentDialogPort,
  AttachmentSourcePort,
  OpenFilesDialogRequest,
  SaveFileDialogRequest,
} from "../attachments/attachment-file-port";

/**
 * 假源文件系统里的一个文件.
 */
export interface FakeSourceFile {
  /**
   * 文件内容.
   */
  readonly content: Buffer;
  /**
   * 是否是普通文件, 默认是; 设为 false 表示它是目录.
   */
  readonly isFile?: boolean;
  /**
   * 覆盖 stat 报告的字节数, 用来在不分配大内存的情况下模拟超大文件.
   */
  readonly reportedSize?: number;
  /**
   * 读取内容时拒绝的错误, 用来模拟读取失败.
   */
  readonly readError?: Error;
}

/**
 * 假的源文件系统与它的间谍方法.
 */
export interface FakeSource {
  /**
   * 注入给被测代码的源文件系统能力.
   */
  readonly port: AttachmentSourcePort;
  /**
   * 读取内容方法的间谍.
   */
  readonly readFile: ReturnType<typeof vi.fn<AttachmentSourcePort["readFile"]>>;
}

/**
 * 给文件名配一个绝对路径, 路径并不真实存在.
 * @param name 文件名.
 * @returns 绝对路径.
 */
export function virtualPath(name: string): string {
  return resolve("virtual-files", name);
}

/**
 * 创建假的源文件系统: 路径不在表里时 stat 与读取都拒绝.
 * @param files 路径到文件的表.
 * @returns 假源文件系统.
 */
export function createFakeSource(
  files: Readonly<Record<string, FakeSourceFile>>,
): FakeSource {
  const find = (filePath: string): FakeSourceFile => {
    const file = files[filePath];
    if (file === undefined) {
      throw new Error("ENOENT");
    }
    return file;
  };
  const readFile = vi.fn<AttachmentSourcePort["readFile"]>((filePath) => {
    const file = find(filePath);
    return file.readError === undefined
      ? Promise.resolve(file.content)
      : Promise.reject(file.readError);
  });
  const port: AttachmentSourcePort = {
    statFile: (filePath) => {
      const file = find(filePath);
      return Promise.resolve({
        isFile: file.isFile ?? true,
        size: file.reportedSize ?? file.content.length,
      });
    },
    readFile,
  };
  return { port, readFile };
}

/**
 * 假的系统对话框与它们收到的请求.
 */
export interface FakeDialogs {
  /**
   * 注入给被测代码的系统对话框.
   */
  readonly port: AttachmentDialogPort;
  /**
   * 选择文件对话框收到过的请求.
   */
  readonly openRequests: OpenFilesDialogRequest[];
  /**
   * 保存对话框收到过的请求.
   */
  readonly saveRequests: SaveFileDialogRequest[];
}

/**
 * 创建假的系统对话框, 按给定结果应答.
 * @param chosenFilePaths 选择文件对话框的结果, undefined 表示用户取消.
 * @param chosenSavePath 保存对话框的结果, undefined 表示用户取消.
 * @returns 假对话框.
 */
export function createFakeDialogs(
  chosenFilePaths: readonly string[] | undefined,
  chosenSavePath: string | undefined = undefined,
): FakeDialogs {
  const openRequests: OpenFilesDialogRequest[] = [];
  const saveRequests: SaveFileDialogRequest[] = [];
  const port: AttachmentDialogPort = {
    showOpenDialog: (request) => {
      openRequests.push(request);
      return Promise.resolve(chosenFilePaths);
    },
    showSaveDialog: (request) => {
      saveRequests.push(request);
      return Promise.resolve(chosenSavePath);
    },
  };
  return { port, openRequests, saveRequests };
}
