import { app } from "electron";
import type { i18n } from "i18next";

import { DEFAULT_RESTORE_LIMITS } from "@shared/restore/restore-limits";

import { scheduleWithTimeout } from "../import/import-session";
import { NODE_RESTORE_FILE } from "../restore/node-restore-file-system";
import type { RestoreDialogPort } from "../restore/restore-ports";
import { RestoreService } from "../restore/restore-service";
import {
  RESTORE_SESSION_LIFETIME_MILLISECONDS,
  RestoreSession,
} from "../restore/restore-session";
import { showOpenDialogOnFocusedWindow } from "./electron-dialogs";
import { reportFailureName } from "./report-failure-name";
import type { VaultRuntime } from "./vault-runtime";

/**
 * 恢复失败日志的前缀.
 */
const RESTORE_FAILURE_SCOPE = "恢复";

/**
 * 恢复相关的运行时对象.
 */
export interface RestoreRuntime {
  /**
   * 恢复服务.
   */
  readonly service: RestoreService;
}

/**
 * 基于 Electron 对话框的系统对话框能力: 选择文件对话框单选, 带备份文件的类型过滤器.
 */
const ELECTRON_RESTORE_DIALOGS: RestoreDialogPort = {
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
};

/**
 * 创建恢复相关的运行时对象: 恢复服务读写保险库已解锁的加密数据库, 备份文件的选择, 读取, 解密,
 * 解包, 校验与写库都在主进程里完成, 路径, 口令与内容不经渲染端. 失败只把错误名称写入日志, 不写
 * 文件名, 路径, 口令与内容. 必须在 app ready 之后调用, 因为系统路径要求如此.
 * @param vault 保险库运行时对象.
 * @param translator 主进程的 i18next 实例, 对话框标题与过滤器名称随它的当前语言.
 * @returns 恢复运行时对象.
 */
export function createRestoreRuntime(
  vault: VaultRuntime,
  translator: i18n,
): RestoreRuntime {
  const service = new RestoreService({
    dialogs: ELECTRON_RESTORE_DIALOGS,
    file: NODE_RESTORE_FILE,
    database: {
      getOrm: () => vault.service.getOrm(),
      onFailure: (error) => reportFailureName(RESTORE_FAILURE_SCOPE, error),
    },
    verifier: vault.masterPasswordVerifier,
    session: new RestoreSession({
      lifetimeMilliseconds: RESTORE_SESSION_LIFETIME_MILLISECONDS,
      scheduleExpiry: scheduleWithTimeout,
    }),
    translate: (key) => String(translator.t(key)),
    defaultDirectory: app.getPath("documents"),
    limits: DEFAULT_RESTORE_LIMITS,
    now: Date.now,
  });
  return { service };
}
