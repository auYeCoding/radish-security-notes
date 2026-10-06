import { join } from "node:path";

import { app } from "electron";
import type { i18n } from "i18next";

import type { EmailBackupTranslate } from "@shared/email-backup/email-backup-message-keys";

import { AutoBackupScheduler } from "../email-backup/auto-backup-scheduler";
import { AutoBackupSettingsService } from "../email-backup/auto-backup-settings-service";
import { BackupFileGenerator } from "../email-backup/backup-file-generator";
import {
  BackupTemporaryStore,
  NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
} from "../email-backup/backup-temp-store";
import {
  createEmailBackupAuthorization,
  type EmailBackupAuthorization,
} from "../email-backup/email-backup-authorization";
import { EmailBackupLedger } from "../email-backup/email-backup-ledger";
import {
  createEmailBackupProgressTracker,
  type EmailBackupProgressTracker,
} from "../email-backup/email-backup-progress-tracker";
import { EmailBackupRunner } from "../email-backup/email-backup-runner";
import { EmailBackupService } from "../email-backup/email-backup-service";
import { EmailBackupSettingsService } from "../email-backup/email-backup-settings-service";
import { EmailTestSender } from "../email-backup/email-test-sender";
import { createNodemailerMailSender } from "../email-backup/nodemailer-mail-sender";
import { SYSTEM_SCHEDULER_CLOCK } from "../email-backup/scheduler-clock";
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
  /**
   * 启动自动备份调度: 保险库解锁后立即检查一次补发错过的备份, 之后每五分钟检查一次.
   */
  readonly startAutoBackup: () => void;
  /**
   * 停止自动备份调度, 应用退出时调用.
   */
  readonly stopAutoBackup: () => void;
}

/**
 * 备份文件的生成与临时存放: 进度, 临时目录与生成器.
 */
interface BackupPipeline {
  /**
   * 进度记录器.
   */
  readonly progress: EmailBackupProgressTracker;
  /**
   * 备份临时目录存储.
   */
  readonly temporaryStore: BackupTemporaryStore;
  /**
   * 备份文件生成器.
   */
  readonly generator: BackupFileGenerator;
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
 * 创建备份文件的生成与临时存放.
 * @param database 取数据库与报告失败的依赖.
 * @param translator 主进程的 i18next 实例.
 * @returns 生成与临时存放的对象.
 */
function createBackupPipeline(
  database: DatabaseAccess,
  translator: i18n,
): BackupPipeline {
  const progress = createEmailBackupProgressTracker();
  const temporaryStore = new BackupTemporaryStore({
    fileSystem: NODE_BACKUP_TEMPORARY_FILE_SYSTEM,
    directory: join(app.getPath("userData"), TEMPORARY_DIRECTORY_NAME),
    onFailure: database.onFailure,
  });
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
  return { progress, temporaryStore, generator };
}

/**
 * 创建邮箱备份服务, 手动备份与自动备份共用同一个服务与同一条备份流程.
 * @param database 取数据库与报告失败的依赖.
 * @param authorization 身份复核.
 * @param pipeline 备份文件的生成与临时存放.
 * @param translator 主进程的 i18next 实例, 邮件主题与正文随它的当前语言.
 * @returns 邮箱备份服务.
 */
function createService(
  database: DatabaseAccess,
  authorization: EmailBackupAuthorization,
  pipeline: BackupPipeline,
  translator: i18n,
): EmailBackupService {
  const sender = createNodemailerMailSender();
  const translate: EmailBackupTranslate = (key, parameters) =>
    String(translator.t(key, parameters));
  const now = (): Date => new Date();
  return new EmailBackupService({
    database,
    settings: new EmailBackupSettingsService({ database, authorization }),
    runner: new EmailBackupRunner({
      database,
      authorization,
      generator: pipeline.generator,
      temporaryStore: pipeline.temporaryStore,
      sender,
      progress: pipeline.progress,
      ledger: new EmailBackupLedger({ database, now }),
      translate,
      now,
    }),
    testSender: new EmailTestSender({ database, sender, translate }),
    progress: pipeline.progress,
    autoBackup: new AutoBackupSettingsService({ database, authorization, now }),
    now,
  });
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
  const pipeline = createBackupPipeline(database, translator);
  const service = createService(database, authorization, pipeline, translator);
  const scheduler = new AutoBackupScheduler({
    clock: SYSTEM_SCHEDULER_CLOCK,
    isUnlocked: () => database.getOrm() !== undefined,
    backup: service,
    onFailure: database.onFailure,
  });
  return {
    service,
    discardTemporaryFiles: () => pipeline.temporaryStore.discardAll(),
    startAutoBackup: () => scheduler.start(),
    stopAutoBackup: () => scheduler.stop(),
  };
}
