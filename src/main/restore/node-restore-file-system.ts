import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";

import type { RestoreFilePort } from "./restore-ports";

/**
 * 基于 Node 文件系统的备份文件读取能力.
 */
export const NODE_RESTORE_FILE: RestoreFilePort = {
  statFile: async (filePath) => {
    const stats = await stat(filePath);
    return { isFile: stats.isFile(), size: stats.size };
  },
  readHead: async (filePath, length) => {
    const handle = await open(filePath, "r");
    try {
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  },
  openStream: (filePath) => createReadStream(filePath),
};
