import { readFile, stat, writeFile } from "node:fs/promises";

import type { ImportFilePort, ImportReportSinkPort } from "./import-ports";

/**
 * 基于 Node 文件系统的来源文件读取能力.
 */
export const NODE_IMPORT_FILE: ImportFilePort = {
  statFile: async (filePath) => {
    const stats = await stat(filePath);
    return { isFile: stats.isFile(), size: stats.size };
  },
  readFile: (filePath) => readFile(filePath),
};

/**
 * 基于 Node 文件系统的未能带入清单写出能力.
 */
export const NODE_IMPORT_REPORT_SINK: ImportReportSinkPort = {
  writeTextFile: (filePath, text) => writeFile(filePath, text, "utf8"),
};
