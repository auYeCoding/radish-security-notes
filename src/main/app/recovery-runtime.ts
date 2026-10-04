import { writeFile } from "node:fs/promises";

import { app } from "electron";
import type { i18n } from "i18next";

import { readRecoveryTextFileLabels } from "../recovery/recovery-text-file-labels";
import {
  RecoveryTextFileSaver,
  type RecoveryTextFilePort,
  type SaveDialogRequest,
} from "../recovery/recovery-text-file-saver";
import { showSaveDialogOnFocusedWindow } from "./electron-dialogs";
import { reportFailure } from "./report-failure";

/**
 * 恢复词失败日志的前缀.
 */
const RECOVERY_FAILURE_SCOPE = "恢复词";

/**
 * 恢复相关的运行时对象.
 */
export interface RecoveryRuntime {
  /**
   * 恢复词文本文件保存器.
   */
  readonly textFileSaver: RecoveryTextFileSaver;
}

/**
 * 弹出 Electron 的系统保存对话框, 过滤器只列恢复词文本文件的扩展名.
 * @param request 对话框的预填信息.
 * @returns 用户选定的路径, 取消时为 undefined.
 */
function showElectronSaveDialog(
  request: SaveDialogRequest,
): Promise<string | undefined> {
  return showSaveDialogOnFocusedWindow({
    title: request.title,
    defaultPath: request.defaultPath,
    filters: [{ name: request.fileTypeName, extensions: [request.extension] }],
  });
}

/**
 * 基于 Electron 对话框与 Node 文件写入的系统能力.
 */
const ELECTRON_TEXT_FILE_PORT: RecoveryTextFilePort = {
  showSaveDialog: showElectronSaveDialog,
  writeTextFile: (filePath, content) => writeFile(filePath, content, "utf8"),
};

/**
 * 创建恢复相关的运行时对象. 必须在 app ready 之后调用, 因为系统路径要求如此.
 * @param translator 主进程的 i18next 实例, 文本文件的文案随它的当前语言.
 * @returns 恢复运行时对象.
 */
export function createRecoveryRuntime(translator: i18n): RecoveryRuntime {
  return {
    textFileSaver: new RecoveryTextFileSaver({
      port: ELECTRON_TEXT_FILE_PORT,
      defaultDirectory: app.getPath("documents"),
      now: () => new Date(),
      readLabels: (generatedDate) =>
        readRecoveryTextFileLabels(translator, generatedDate),
      onFailure: (error) => reportFailure(RECOVERY_FAILURE_SCOPE, error),
    }),
  };
}
