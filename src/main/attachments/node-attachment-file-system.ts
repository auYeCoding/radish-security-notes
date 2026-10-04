import { chmodSync, existsSync, readdirSync, rmSync } from "node:fs";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import type {
  AttachmentSinkPort,
  AttachmentSourcePort,
  TemporaryCopyFileSystemPort,
} from "./attachment-file-port";

/**
 * 只读文件的权限位, 明文临时副本用它挡住外部程序对副本的改动.
 */
const READ_ONLY_FILE_MODE = 0o444;

/**
 * 可写文件的权限位, 删除只读副本之前先用它去掉只读属性.
 */
const WRITABLE_FILE_MODE = 0o666;

/**
 * 去掉一棵目录里全部文件的只读属性. Electron 内置的 Node 在 Windows 上删除含只读文件的目录会报
 * EPERM, 所以删除之前先让文件可写.
 * @param directoryPath 目录路径, 目录不存在时什么都不做.
 */
function makeTreeWritable(directoryPath: string): void {
  if (!existsSync(directoryPath)) {
    return;
  }
  readdirSync(directoryPath, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .forEach((entry) =>
      chmodSync(join(entry.parentPath, entry.name), WRITABLE_FILE_MODE),
    );
}

/**
 * 基于 Node 文件系统的源文件读取能力.
 */
export const NODE_ATTACHMENT_SOURCE: AttachmentSourcePort = {
  statFile: async (filePath) => {
    const stats = await stat(filePath);
    return { isFile: stats.isFile(), size: stats.size };
  },
  readFile: (filePath) => readFile(filePath),
};

/**
 * 基于 Node 文件系统的写出能力.
 */
export const NODE_ATTACHMENT_SINK: AttachmentSinkPort = {
  writeFile: (filePath, content) => writeFile(filePath, content),
  renameFile: (fromPath, toPath) => rename(fromPath, toPath),
  removeFile: (filePath) => rm(filePath, { force: true }),
};

/**
 * 基于 Node 文件系统的明文临时副本能力.
 */
export const NODE_TEMPORARY_COPY_FILE_SYSTEM: TemporaryCopyFileSystemPort = {
  makeDirectory: async (directoryPath) => {
    await mkdir(directoryPath, { recursive: true });
  },
  writeFile: (filePath, content) => writeFile(filePath, content),
  makeReadOnly: (filePath) => chmod(filePath, READ_ONLY_FILE_MODE),
  removeDirectoryTreeSync: (directoryPath) => {
    makeTreeWritable(directoryPath);
    rmSync(directoryPath, { recursive: true, force: true });
  },
};
