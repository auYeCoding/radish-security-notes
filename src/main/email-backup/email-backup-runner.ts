import { BYTES_PER_MEBIBYTE } from "@shared/email-backup/email-backup-limits";
import type { EmailBackupTranslate } from "@shared/email-backup/email-backup-message-keys";
import {
  emailBackupFailed,
  emailBackupSucceeded,
  type EmailBackupResult,
  type EmailBackupRunOutcome,
  type EmailBackupRunRequest,
} from "@shared/email-backup/email-backup-result";
import type {
  EmailBackupTriggerKind,
  UnattendedTriggerKind,
} from "@shared/email-backup/email-backup-trigger-kind";

import type { DatabaseAccess } from "../vault/database/database-access";
import type {
  BackupFileGenerator,
  GeneratedBackupFile,
} from "./backup-file-generator";
import type { BackupTemporaryStore } from "./backup-temp-store";
import type { EmailBackupAuthorization } from "./email-backup-authorization";
import { EmailBackupFailureError } from "./email-backup-failure-error";
import type { EmailBackupLedger } from "./email-backup-ledger";
import { toMailSession } from "./email-backup-mail-session";
import type { EmailBackupProgressTracker } from "./email-backup-progress-tracker";
import { findBackupReadinessProblem } from "./email-backup-readiness";
import {
  readStoredState,
  type EmailBackupStoredState,
} from "./email-backup-stored-state";
import { classifyMailSendError } from "./mail-send-error-classifier";
import { buildBackupMail } from "./mail-message-builder";
import type { MailSenderPort } from "./mail-sender-port";
import { estimateMailSizeBytes } from "./mail-size-estimator";

/**
 * 立即备份流程的依赖.
 */
export interface EmailBackupRunnerDependencies {
  /**
   * 取已解锁数据库与报告失败的依赖.
   */
  readonly database: DatabaseAccess;
  /**
   * 身份复核.
   */
  readonly authorization: EmailBackupAuthorization;
  /**
   * 备份文件生成器.
   */
  readonly generator: BackupFileGenerator;
  /**
   * 备份临时目录存储, 发完或失败后用它删除备份文件.
   */
  readonly temporaryStore: BackupTemporaryStore;
  /**
   * 邮件发送能力.
   */
  readonly sender: MailSenderPort;
  /**
   * 进度记录器.
   */
  readonly progress: EmailBackupProgressTracker;
  /**
   * 账本, 备份尝试结束后用它记上次结果与自动备份的退避状态.
   */
  readonly ledger: EmailBackupLedger;
  /**
   * 取当前语言文案的函数, 邮件模板用.
   */
  readonly translate: EmailBackupTranslate;
  /**
   * 取当前时刻.
   */
  readonly now: () => Date;
}

/**
 * 一次备份尝试的上下文.
 */
interface BackupAttemptContext {
  /**
   * 是否去掉附件.
   */
  readonly withoutAttachments: boolean;
  /**
   * 这次备份是怎么触发的.
   */
  readonly triggerKind: EmailBackupTriggerKind;
}

/**
 * 备份流程: 校验已保存的设置, 生成备份文件, 估计大小, 发送, 删除临时文件, 把结果交给账本.
 * 手动备份先校验重输的主密码; 自动备份在保险库已解锁期间无人值守地走同一条流程. 授权码与口令只在
 * 这个流程的局部变量里出现, 不进返回值, 日志与错误信息.
 */
export class EmailBackupRunner {
  /**
   * 创建备份流程.
   * @param dependencies 流程依赖.
   */
  constructor(private readonly dependencies: EmailBackupRunnerDependencies) {}

  /**
   * 执行一次立即备份 (手动触发).
   * @param request 备份请求.
   * @returns 已发出的摘要, 或估计超出上限而没有发送; 校验不通过, 生成失败, 发送失败时为失败结果.
   */
  async run(
    request: EmailBackupRunRequest,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    const ready = this.loadReadyState();
    if (!ready.ok) {
      return ready;
    }
    if (
      !(await this.dependencies.authorization.isAuthorized(
        request.masterPassword,
      ))
    ) {
      return emailBackupFailed("wrong-master-password");
    }
    return this.attempt(ready.value, {
      withoutAttachments: request.withoutAttachments,
      triggerKind: "manual",
    });
  }

  /**
   * 执行一次无人值守的自动备份, 不校验主密码 (开启自动备份时已校验), 也不去掉附件.
   * @param triggerKind 触发方式, 定时或启动补发.
   * @returns 已发出的摘要, 或估计超出上限而没有发送; 设置不全, 生成失败, 发送失败时为失败结果.
   */
  async runUnattended(
    triggerKind: UnattendedTriggerKind,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    const ready = this.loadReadyState();
    if (!ready.ok) {
      return ready;
    }
    return this.attempt(ready.value, {
      withoutAttachments: false,
      triggerKind,
    });
  }

  /**
   * 读出已保存的状态并确认能备份.
   * @returns 能备份时的状态; 未解锁, 设置不全或没有口令等不能备份时为失败结果.
   */
  private loadReadyState(): EmailBackupResult<EmailBackupStoredState> {
    const state = readStoredState(this.dependencies.database);
    if (!state.ok) {
      return state;
    }
    const rejection = findBackupReadinessProblem(state.value);
    return rejection === undefined ? state : emailBackupFailed(rejection);
  }

  /**
   * 生成备份文件并投递, 无论成败都删除临时文件.
   * @param state 邮箱备份状态.
   * @param context 备份尝试的上下文.
   * @returns 备份结果.
   */
  private async attempt(
    state: EmailBackupStoredState,
    context: BackupAttemptContext,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    const { settings, credentials } = state;
    const generated = await this.dependencies.generator.generate({
      includeAttachments: !context.withoutAttachments,
      passphrase: settings.isEncrypted ? credentials.passphrase : undefined,
    });
    if (!generated.ok) {
      this.dependencies.ledger.recordFailure(
        context.triggerKind,
        generated.reason,
      );
      return generated;
    }
    try {
      return await this.deliver(state, generated.value, context);
    } finally {
      await this.dependencies.temporaryStore.remove(generated.value.filePath);
    }
  }

  /**
   * 估计邮件大小, 超出上限就不发送, 否则发送.
   * @param state 邮箱备份状态.
   * @param file 生成好的备份文件.
   * @param context 备份尝试的上下文.
   * @returns 备份结果.
   */
  private async deliver(
    state: EmailBackupStoredState,
    file: GeneratedBackupFile,
    context: BackupAttemptContext,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    const limitBytes = state.settings.sizeLimitMebibytes * BYTES_PER_MEBIBYTE;
    const estimatedSizeBytes = estimateMailSizeBytes(file.fileSizeBytes);
    if (estimatedSizeBytes <= limitBytes) {
      return this.send(state, file, context);
    }
    this.dependencies.ledger.recordFailure(context.triggerKind, "too-large");
    return emailBackupSucceeded({
      status: "too-large",
      estimatedSizeBytes,
      limitBytes,
      canDropAttachments: file.attachmentCount > 0,
    });
  }

  /**
   * 经邮件发送能力发出备份邮件, 把结果交给账本.
   * @param state 邮箱备份状态.
   * @param file 生成好的备份文件.
   * @param context 备份尝试的上下文.
   * @returns 发出的摘要, 发送失败时为失败结果.
   */
  private async send(
    state: EmailBackupStoredState,
    file: GeneratedBackupFile,
    context: BackupAttemptContext,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    const { sender, progress, translate, database, ledger } = this.dependencies;
    const session = toMailSession(state);
    const completedAt = this.dependencies.now();
    progress.beginSending();
    try {
      await sender.send(
        session.connection,
        session.credentials,
        buildBackupMail(
          translate,
          session.addresses,
          { completedAt, ...file },
          { fileName: file.fileName, filePath: file.filePath },
        ),
      );
    } catch (error) {
      const reason = classifyMailSendError(error);
      database.onFailure(new EmailBackupFailureError(reason));
      ledger.recordFailure(context.triggerKind, reason);
      return emailBackupFailed(reason);
    }
    ledger.recordSuccess(context.triggerKind, completedAt.getTime());
    return emailBackupSucceeded({
      status: "sent",
      summary: {
        completedAt: completedAt.getTime(),
        fileSizeBytes: file.fileSizeBytes,
        entryCount: file.entryCount,
        attachmentCount: file.attachmentCount,
        includesAttachments: file.includesAttachments,
        isEncrypted: file.isEncrypted,
      },
    });
  }
}
