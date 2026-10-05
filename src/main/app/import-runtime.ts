import { randomUUID } from "node:crypto";

import { app, shell } from "electron";
import type { i18n } from "i18next";

import { createDefaultSourceRegistry } from "../import/default-source-registry";
import type { ImportDialogPort } from "../import/import-ports";
import { yieldToEventLoop } from "../import/import-progress";
import { ImportService } from "../import/import-service";
import {
  IMPORT_SESSION_LIFETIME_MILLISECONDS,
  ImportSession,
  scheduleWithTimeout,
} from "../import/import-session";
import {
  NODE_IMPORT_FILE,
  NODE_IMPORT_REPORT_SINK,
} from "../import/node-import-file-system";
import type { VaultService } from "../vault/vault-service";
import {
  showOpenDialogOnFocusedWindow,
  showSaveDialogOnFocusedWindow,
} from "./electron-dialogs";
import { reportFailureName } from "./report-failure-name";

/**
 * 导入失败日志的前缀.
 */
const IMPORT_FAILURE_SCOPE = "导入";

/**
 * 导入相关的运行时对象.
 */
export interface ImportRuntime {
  /**
   * 导入服务.
   */
  readonly service: ImportService;
}

/**
 * 基于 Electron 对话框的系统对话框能力: 选择文件对话框单选, 带按文件格式给出的类型过滤器.
 */
const ELECTRON_IMPORT_DIALOGS: ImportDialogPort = {
  showOpenDialog: async (request) => {
    const paths = await showOpenDialogOnFocusedWindow({
      title: request.title,
      defaultPath: request.defaultDirectory,
      filters: [
        { name: request.filterName, extensions: [...request.extensions] },
      ],
      properties: ["openFile"],
    });
    return paths?.[0];
  },
  showSaveDialog: (request) =>
    showSaveDialogOnFocusedWindow({
      title: request.title,
      defaultPath: request.defaultPath,
    }),
};

/**
 * 创建导入相关的运行时对象: 导入服务读写保险库已解锁的加密数据库, 来源文件的选择, 读取, 解析
 * 都在主进程里完成, 内容不经渲染端. 失败只把错误名称写入日志, 不写文件名与内容. 必须在 app
 * ready 之后调用, 因为系统路径要求如此.
 * @param vault 保险库服务.
 * @param translator 主进程的 i18next 实例, 对话框标题与清单文本随它的当前语言.
 * @returns 导入运行时对象.
 */
export function createImportRuntime(
  vault: VaultService,
  translator: i18n,
): ImportRuntime {
  const service = new ImportService({
    dialogs: ELECTRON_IMPORT_DIALOGS,
    file: NODE_IMPORT_FILE,
    reportSink: NODE_IMPORT_REPORT_SINK,
    shell: { showItemInFolder: (path) => shell.showItemInFolder(path) },
    registry: createDefaultSourceRegistry(),
    database: {
      getOrm: () => vault.getOrm(),
      onFailure: (error) => reportFailureName(IMPORT_FAILURE_SCOPE, error),
    },
    session: new ImportSession({
      lifetimeMilliseconds: IMPORT_SESSION_LIFETIME_MILLISECONDS,
      scheduleExpiry: scheduleWithTimeout,
    }),
    translate: (key, values) => String(translator.t(key, values)),
    defaultDirectory: app.getPath("documents"),
    createIdentifier: randomUUID,
    now: Date.now,
    yieldToEventLoop,
  });
  return { service };
}
