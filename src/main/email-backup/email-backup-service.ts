import type { EmailBackupProgressSnapshot } from "@shared/email-backup/email-backup-progress";
import {
  emailBackupFailed,
  emailBackupSucceeded,
  type EmailBackupFailureReason,
  type EmailBackupLastResult,
  type EmailBackupResult,
  type EmailBackupRunOutcome,
  type EmailBackupRunRequest,
} from "@shared/email-backup/email-backup-result";
import type {
  EmailBackupSettingsInput,
  EmailBackupSettingsView,
} from "@shared/email-backup/email-backup-settings";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import { readLastResult } from "./email-backup-last-result-repository";
import type { EmailBackupProgressTracker } from "./email-backup-progress-tracker";
import type { EmailBackupRunner } from "./email-backup-runner";
import type { EmailBackupSettingsService } from "./email-backup-settings-service";
import type { EmailTestSender } from "./email-test-sender";

/**
 * 邮箱备份服务的依赖.
 */
export interface EmailBackupServiceDependencies {
  /**
   * 取已解锁数据库与报告失败的依赖.
   */
  readonly database: DatabaseAccess;
  /**
   * 设置服务.
   */
  readonly settings: EmailBackupSettingsService;
  /**
   * 立即备份流程.
   */
  readonly runner: EmailBackupRunner;
  /**
   * 测试邮件发送.
   */
  readonly testSender: EmailTestSender;
  /**
   * 进度记录器.
   */
  readonly progress: EmailBackupProgressTracker;
}

/**
 * 邮箱备份服务: 渲染端能调用的全部入口. 同一时间只处理一次发送 (测试邮件或立即备份), 第二次返回
 * `busy`. 数据库未解锁时全部入口都返回 `vault-locked`.
 */
export class EmailBackupService {
  /**
   * 是否有一次发送正在进行.
   */
  private isBusy = false;

  /**
   * 创建邮箱备份服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: EmailBackupServiceDependencies) {}

  /**
   * 读取已保存的设置视图.
   * @returns 设置视图, 未解锁时为失败结果.
   */
  getSettings(): Promise<EmailBackupResult<EmailBackupSettingsView>> {
    return this.dependencies.settings.getView();
  }

  /**
   * 保存设置.
   * @param input 保存设置的请求.
   * @returns 保存后的设置视图.
   */
  saveSettings(
    input: EmailBackupSettingsInput,
  ): Promise<EmailBackupResult<EmailBackupSettingsView>> {
    return this.dependencies.settings.save(input);
  }

  /**
   * 发送测试邮件.
   * @returns 发送结果.
   */
  sendTest(): Promise<EmailBackupResult<undefined>> {
    return this.runExclusively(() => this.dependencies.testSender.send());
  }

  /**
   * 立即备份.
   * @param request 备份请求.
   * @returns 备份结果.
   */
  runBackup(
    request: EmailBackupRunRequest,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    return this.runExclusively(() => this.dependencies.runner.run(request));
  }

  /**
   * 读取当前备份的进度.
   * @returns 进度快照.
   */
  getProgress(): EmailBackupProgressSnapshot {
    return this.dependencies.progress.snapshot();
  }

  /**
   * 读取上次备份的结果.
   * @returns 上次结果, 从没备份过时为 undefined, 未解锁时为失败结果.
   */
  getLastResult(): EmailBackupResult<EmailBackupLastResult | undefined> {
    return runWithDatabase<
      EmailBackupLastResult | undefined,
      EmailBackupFailureReason
    >(this.dependencies.database, (orm) =>
      emailBackupSucceeded(readLastResult(orm)),
    );
  }

  /**
   * 单飞地执行一次发送: 已有发送在进行时返回 `busy`, 意外错误只通知失败回调并返回
   * `unexpected-error`, 结束后让进度回到空闲.
   * @param operation 要执行的发送.
   * @returns 发送结果.
   */
  private async runExclusively<Value>(
    operation: () => Promise<EmailBackupResult<Value>>,
  ): Promise<EmailBackupResult<Value>> {
    if (this.isBusy) {
      return emailBackupFailed("busy");
    }
    this.isBusy = true;
    try {
      return await operation();
    } catch (error) {
      this.dependencies.database.onFailure(error);
      return emailBackupFailed("unexpected-error");
    } finally {
      this.isBusy = false;
      this.dependencies.progress.reset();
    }
  }
}
