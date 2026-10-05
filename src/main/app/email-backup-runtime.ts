import { join } from "node:path";

import { app } from "electron";
import type { i18n } from "i18next";

import type { EmailBackupTranslate } from "@shared/email-backup/email-backup-message-keys";

import { BackupFileGenerator } from "../email-backup/backup-file-generator";
import {
  BackupTemporaryStore,
  NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
} from "../email-backup/backup-temp-store";
import { createEmailBackupAuthorization } from "../email-backup/email-backup-authorization";
import { createEmailBackupProgressTracker } from "../email-backup/email-backup-progress-tracker";
import { EmailBackupRunner } from "../email-backup/email-backup-runner";
import { EmailBackupService } from "../email-backup/email-backup-service";
import { EmailBackupSettingsService } from "../email-backup/email-backup-settings-service";
import { EmailTestSender } from "../email-backup/email-test-sender";
import { createNodemailerMailSender } from "../email-backup/nodemailer-mail-sender";
import { NODE_EXPORT_FILE } from "../export/node-export-file-system";
import { createDefaultExportSerializerRegistry } from "../export/serializers/default-serializer-registry";
import { yieldToEventLoop } from "../import/import-progress";
import type { DatabaseAccess } from "../vault/database/database-access";
import { reportFailureName } from "./report-failure-name";
import type { VaultRuntime } from "./vault-runtime";

/**
 * 邮箱备份失败日志的前缀.
 */
const EMAIL_BACKUP_FAILURE_SCOPE = "邮箱备份";

/**
 * 备份临时文件专属目录的名称, 在用户数据目录之下.
 */
const TEMPORARY_DIRECTORY_NAME = "email-backup-temp";

/**
 * 邮箱备份相关的运行时对象.
 */
export interface EmailBackupRuntime {
  /**
   * 邮箱备份服务.
   */
  readonly service: EmailBackupService;
  /**
   * 清扫备份临时目录, 应用启动时清除上次崩溃的残留, 退出时清除本次的残留.
   */
  readonly discardTemporaryFiles: () => void;
}

/**
 * 创建邮箱备份取数据库与报告失败的依赖: 只把错误名称写入日志, 不写邮箱地址, 服务器, 授权码,
 * 口令, 文件名与内容.
 * @param vault 保险库运行时对象.
 * @returns 取数据库与报告失败的依赖.
 */
function createDatabaseAccess(vault: VaultRuntime): DatabaseAccess {
  return {
    getOrm: () => vault.service.getOrm(),
    onFailure: (error) => reportFailureName(EMAIL_BACKUP_FAILURE_SCOPE, error),
  };
}

/**
 * 创建邮箱备份相关的运行时对象: 设置与机密存在已解锁的加密数据库里, 备份文件在主进程里生成并
 * 发送, 内容不经渲染端. 必须在 app ready 之后调用, 因为系统路径要求如此.
 * @param vault 保险库运行时对象.
 * @param translator 主进程的 i18next 实例, 邮件主题与正文随它的当前语言.
 * @returns 邮箱备份运行时对象.
 */
export function createEmailBackupRuntime(
  vault: VaultRuntime,
  translator: i18n,
): EmailBackupRuntime {
  const database = createDatabaseAccess(vault);
  const authorization = createEmailBackupAuthorization(
    vault.masterPasswordVerifier,
  );
  const progress = createEmailBackupProgressTracker();
  const temporaryStore = new BackupTemporaryStore({
    fileSystem: NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
    directory: join(app.getPath("userData"), TEMPORARY_DIRECTORY_NAME),
    onFailure: database.onFailure,
  });
  const sender = createNodemailerMailSender();
  const translate: EmailBackupTranslate = (key, parameters) =>
    String(translator.t(key, parameters));
  const generator = new BackupFileGenerator({
    database,
    serializers: createDefaultExportSerializerRegistry(),
    file: NODE_EXPORT_FILE,
    temporaryStore,
    tracker: progress.generation,
    translate: (key) => String(translator.t(key)),
    now: () => new Date(),
    yieldToEventLoop,
  });
  const service = new EmailBackupService({
    database,
    settings: new EmailBackupSettingsService({ database, authorization }),
    runner: new EmailBackupRunner({
      database,
      authorization,
      generator,
      temporaryStore,
      sender,
      progress,
      translate,
      now: () => new Date(),
    }),
    testSender: new EmailTestSender({ database, sender, translate }),
    progress,
  });
  return {
    service,
    discardTemporaryFiles: () => temporaryStore.discardAll(),
  };
}
