import { app, shell } from "electron";
import type { i18n } from "i18next";

import { ExportService } from "../export/export-service";
import type { ExportDialogPort } from "../export/export-ports";
import { NODE_EXPORT_FILE } from "../export/node-export-file-system";
import { createDefaultExportSerializerRegistry } from "../export/serializers/default-serializer-registry";
import { yieldToEventLoop } from "../import/import-progress";
import { showSaveDialogOnFocusedWindow } from "./electron-dialogs";
import { reportFailureName } from "./report-failure-name";
import type { VaultRuntime } from "./vault-runtime";

/**
 * 导出失败日志的前缀.
 */
const EXPORT_FAILURE_SCOPE = "导出";

/**
 * 导出相关的运行时对象.
 */
export interface ExportRuntime {
  /**
   * 导出服务.
   */
  readonly service: ExportService;
}

/**
 * 基于 Electron 对话框的系统对话框能力: 保存对话框带按格式给出的类型过滤器.
 */
const ELECTRON_EXPORT_DIALOGS: ExportDialogPort = {
  showSaveDialog: (request) =>
    showSaveDialogOnFocusedWindow({
      title: request.title,
      defaultPath: request.defaultPath,
      filters: [
        { name: request.filterName, extensions: [...request.extensions] },
      ],
    }),
};

/**
 * 创建导出相关的运行时对象: 导出服务读取保险库已解锁的加密数据库, 数据的读取, 序列化, 加密与
 * 写文件都在主进程里完成, 内容不经渲染端. 失败只把错误名称写入日志, 不写文件名, 路径与内容.
 * 必须在 app ready 之后调用, 因为系统路径要求如此.
 * @param vault 保险库运行时对象.
 * @param translator 主进程的 i18next 实例, 对话框标题, 过滤器名称与预设字段名随它的当前语言.
 * @returns 导出运行时对象.
 */
export function createExportRuntime(
  vault: VaultRuntime,
  translator: i18n,
): ExportRuntime {
  const service = new ExportService({
    dialogs: ELECTRON_EXPORT_DIALOGS,
    file: NODE_EXPORT_FILE,
    shell: { showItemInFolder: (path) => shell.showItemInFolder(path) },
    serializers: createDefaultExportSerializerRegistry(),
    database: {
      getOrm: () => vault.service.getOrm(),
      onFailure: (error) => reportFailureName(EXPORT_FAILURE_SCOPE, error),
    },
    verifier: vault.masterPasswordVerifier,
    translate: (key) => String(translator.t(key)),
    defaultDirectory: app.getPath("documents"),
    now: () => new Date(),
    yieldToEventLoop,
  });
  return { service };
}
