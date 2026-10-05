import { BYTES_PER_MEBIBYTE } from "@shared/email-backup/email-backup-limits";
import type { EmailBackupTranslate } from "@shared/email-backup/email-backup-message-keys";
import {
  emailBackupFailed,
  emailBackupSucceeded,
  type EmailBackupFailureReason,
  type EmailBackupLastResult,
  type EmailBackupResult,
  type EmailBackupRunOutcome,
  type EmailBackupRunRequest,
} from "@shared/email-backup/email-backup-result";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type {
  BackupFileGenerator,
  GeneratedBackupFile,
} from "./backup-file-generator";
import type { BackupTemporaryStore } from "./backup-temp-store";
import type { EmailBackupAuthorization } from "./email-backup-authorization";
import { EmailBackupFailureError } from "./email-backup-failure-error";
import { writeLastResult } from "./email-backup-last-result-repository";
import {
  findMailSessionRejection,
  toMailSession,
} from "./email-backup-mail-session";
import type { EmailBackupProgressTracker } from "./email-backup-progress-tracker";
import {
  readStoredState,
  type EmailBackupStoredState,
} from "./email-backup-stored-state";
import { classifyMailSendError } from "./mail-send-error-classifier";
import { buildBackupMail } from "./mail-message-builder";
import type { MailSenderPort } from "./mail-sender-port";
import { estimateMailSizeBytes } from "./mail-size-estimator";

/**
 * 不记进上次结果的失败: 备份根本没有开始, 或没有可备份的数据.
 */
const UNRECORDED_FAILURES: readonly EmailBackupFailureReason[] = [
  "vault-locked",
  "no-entries",
  "too-many-entries",
];

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
   * 取当前语言文案的函数, 邮件模板用.
   */
  readonly translate: EmailBackupTranslate;
  /**
   * 取当前时刻.
   */
  readonly now: () => Date;
}

/**
 * 判断已保存的状态能不能立即备份: 能发邮件, 加密时有口令, 明文时已确认风险.
 * @param state 邮箱备份状态.
 * @returns 不能备份时的失败原因, 能备份时为 undefined.
 */
function findRunRejection(
  state: EmailBackupStoredState,
): EmailBackupFailureReason | undefined {
  const rejection = findMailSessionRejection(state);
  if (rejection !== undefined) {
    return rejection;
  }
  if (state.settings.isEncrypted) {
    return state.credentials.passphrase === undefined
      ? "passphrase-missing"
      : undefined;
  }
  return state.settings.hasAcknowledgedPlaintextRisk
    ? undefined
    : "plaintext-not-acknowledged";
}

/**
 * 立即备份流程: 校验已保存的设置与重输的主密码, 生成备份文件, 估计大小, 发送, 删除临时文件, 记录
 * 上次结果. 授权码与口令只在这个流程的局部变量里出现, 不进返回值, 日志与错误信息.
 */
export class EmailBackupRunner {
  /**
   * 创建立即备份流程.
   * @param dependencies 流程依赖.
   */
  constructor(private readonly dependencies: EmailBackupRunnerDependencies) {}

  /**
   * 执行一次立即备份.
   * @param request 备份请求.
   * @returns 已发出的摘要, 或估计超出上限而没有发送; 校验不通过, 生成失败, 发送失败时为失败结果.
   */
  async run(
    request: EmailBackupRunRequest,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    const { database, authorization } = this.dependencies;
    const state = readStoredState(database);
    if (!state.ok) {
      return state;
    }
    const rejection = findRunRejection(state.value);
    if (rejection !== undefined) {
      return emailBackupFailed(rejection);
    }
    if (!(await authorization.isAuthorized(request.masterPassword))) {
      return emailBackupFailed("wrong-master-password");
    }
    return this.attempt(state.value, request);
  }

  /**
   * 生成备份文件并投递, 无论成败都删除临时文件.
   * @param state 邮箱备份状态.
   * @param request 备份请求.
   * @returns 备份结果.
   */
  private async attempt(
    state: EmailBackupStoredState,
    request: EmailBackupRunRequest,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    const { settings, credentials } = state;
    const generated = await this.dependencies.generator.generate({
      includeAttachments: !request.withoutAttachments,
      passphrase: settings.isEncrypted ? credentials.passphrase : undefined,
    });
    if (!generated.ok) {
      this.recordFailure(generated.reason);
      return generated;
    }
    try {
      return await this.deliver(state, generated.value);
    } finally {
      await this.dependencies.temporaryStore.remove(generated.value.filePath);
    }
  }

  /**
   * 估计邮件大小, 超出上限就不发送, 否则发送.
   * @param state 邮箱备份状态.
   * @param file 生成好的备份文件.
   * @returns 备份结果.
   */
  private async deliver(
    state: EmailBackupStoredState,
    file: GeneratedBackupFile,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    const limitBytes = state.settings.sizeLimitMebibytes * BYTES_PER_MEBIBYTE;
    const estimatedSizeBytes = estimateMailSizeBytes(file.fileSizeBytes);
    if (estimatedSizeBytes <= limitBytes) {
      return this.send(state, file);
    }
    this.recordFailure("too-large");
    return emailBackupSucceeded({
      status: "too-large",
      estimatedSizeBytes,
      limitBytes,
      canDropAttachments: file.attachmentCount > 0,
    });
  }

  /**
   * 经邮件发送能力发出备份邮件, 记录上次结果.
   * @param state 邮箱备份状态.
   * @param file 生成好的备份文件.
   * @returns 发出的摘要, 发送失败时为失败结果.
   */
  private async send(
    state: EmailBackupStoredState,
    file: GeneratedBackupFile,
  ): Promise<EmailBackupResult<EmailBackupRunOutcome>> {
    const { sender, progress, translate, database } = this.dependencies;
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
      this.recordFailure(reason);
      return emailBackupFailed(reason);
    }
    this.recordLastResult({
      completedAt: completedAt.getTime(),
      outcome: "success",
    });
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

  /**
   * 把失败记成上次结果, 备份根本没有开始的失败不记.
   * @param reason 失败原因.
   */
  private recordFailure(reason: EmailBackupFailureReason): void {
    if (UNRECORDED_FAILURES.includes(reason)) {
      return;
    }
    this.recordLastResult({
      completedAt: this.dependencies.now().getTime(),
      outcome: "failure",
      reason,
    });
  }

  /**
   * 把结果写进加密库作为上次结果, 写不进去时只通知失败回调, 不影响备份本身的结果.
   * @param result 要保存的结果.
   */
  private recordLastResult(result: EmailBackupLastResult): void {
    runWithDatabase<undefined, EmailBackupFailureReason>(
      this.dependencies.database,
      (orm) => {
        writeLastResult(orm, result);
        return emailBackupSucceeded(undefined);
      },
    );
  }
}
