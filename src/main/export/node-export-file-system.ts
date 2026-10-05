import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { WriteStream } from "node:fs";
import { open, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import type { ExportFilePort } from "./export-ports";

/**
 * 临时文件的后缀.
 */
const TEMPORARY_FILE_SUFFIX = ".partial";

/**
 * 临时文件只有当前用户可读写.
 */
const TEMPORARY_FILE_MODE = 0o600;

/**
 * 关闭写入流: 销毁流会同时关闭它背后的文件句柄. 已经关闭时什么也不做.
 * @param stream 写入流.
 * @returns 流关闭之后兑现.
 */
async function closeStream(stream: WriteStream): Promise<void> {
  if (stream.closed) {
    return;
  }
  const closed = once(stream, "close");
  stream.destroy();
  await closed;
}

/**
 * 基于 Node 文件系统的导出文件写出能力: 临时文件与目标文件在同一目录, 改名不跨卷, 写完先刷盘
 * 再改名, 崩溃时不会出现写了一半的目标文件. 写入流不自动关闭, 好在写完之后先刷盘再关闭.
 */
export const NODE_EXPORT_FILE: ExportFilePort = {
  createTemporaryFile: async (targetPath) => {
    const path = join(
      dirname(targetPath),
      `.${basename(targetPath)}.${randomUUID()}${TEMPORARY_FILE_SUFFIX}`,
    );
    const handle = await open(path, "wx", TEMPORARY_FILE_MODE);
    const stream = handle.createWriteStream({ autoClose: false });
    return {
      path,
      stream,
      bytesWritten: () => stream.bytesWritten,
      finalize: async () => {
        await handle.sync();
        await closeStream(stream);
      },
      abandon: () => closeStream(stream),
    };
  },
  replaceTarget: (temporaryPath, targetPath) =>
    rename(temporaryPath, targetPath),
  removeFile: (filePath) => rm(filePath, { force: true }),
};
