import {
  operationFailed,
  operationSucceeded,
  type OperationFailure,
  type OperationSuccess,
} from "../result/operation-result";

/**
 * 邮箱备份操作失败的原因, 除了数据库都可能遇到的两种, 还有设置与前置检查不通过, 备份文件生成
 * 失败, 发送失败. 原因码同时是上次备份结果里持久保存的失败原因代码.
 */
export const EMAIL_BACKUP_FAILURE_REASONS = [
  "vault-locked",
  "unexpected-error",
  "invalid-input",
  "invalid-settings",
  "busy",
  "not-configured",
  "unsupported-provider",
  "wrong-master-password",
  "authorization-code-required",
  "invalid-passphrase",
  "passphrase-missing",
  "plaintext-not-acknowledged",
  "no-entries",
  "too-many-entries",
  "attachment-missing",
  "write-failed",
  "too-large",
  "authentication-failed",
  "connection-failed",
  "server-rejected-size",
  "send-failed",
] as const;

/**
 * 邮箱备份操作失败的原因.
 */
export type EmailBackupFailureReason =
  (typeof EMAIL_BACKUP_FAILURE_REASONS)[number];

/**
 * 判断一个值是否是登记过的失败原因.
 * @param value 待判断的值.
 * @returns 是登记过的原因时返回 true.
 */
export function isEmailBackupFailureReason(
  value: unknown,
): value is EmailBackupFailureReason {
  return EMAIL_BACKUP_FAILURE_REASONS.some((reason) => reason === value);
}

/**
 * 邮箱备份操作成功的结果.
 */
export type EmailBackupSuccess<Value> = OperationSuccess<Value>;

/**
 * 邮箱备份操作失败的结果.
 */
export type EmailBackupFailure = OperationFailure<EmailBackupFailureReason>;

/**
 * 邮箱备份操作的结果: 带值的成功, 或带原因的失败.
 */
export type EmailBackupResult<Value> =
  EmailBackupSuccess<Value> | EmailBackupFailure;

/**
 * 构造表示邮箱备份操作成功的结果.
 */
export const emailBackupSucceeded: typeof operationSucceeded =
  operationSucceeded;

/**
 * 构造表示邮箱备份操作失败的结果.
 * @param reason 失败的原因.
 * @returns 带原因的失败结果.
 */
export function emailBackupFailed(
  reason: EmailBackupFailureReason,
): EmailBackupFailure {
  return operationFailed(reason);
}

/**
 * 一次邮箱备份发送成功后的摘要. 只有时间, 大小与计数, 没有任何条目内容, 邮箱地址与文件名.
 */
export interface EmailBackupSummary {
  /**
   * 完成的时刻, 自 1970 年起的毫秒数.
   */
  readonly completedAt: number;
  /**
   * 备份文件的字节数.
   */
  readonly fileSizeBytes: number;
  /**
   * 备份里的条目数.
   */
  readonly entryCount: number;
  /**
   * 备份里带的附件个数.
   */
  readonly attachmentCount: number;
  /**
   * 备份是否含附件.
   */
  readonly includesAttachments: boolean;
  /**
   * 备份是否用口令加密.
   */
  readonly isEncrypted: boolean;
}

/**
 * 立即备份的结果: 已发出, 或估计超出邮箱上限而没有发送.
 */
export type EmailBackupRunOutcome =
  | {
      /**
       * 结果的种类, 已发出恒为 sent.
       */
      readonly status: "sent";
      /**
       * 发送成功的摘要.
       */
      readonly summary: EmailBackupSummary;
    }
  | {
      /**
       * 结果的种类, 超出上限恒为 too-large.
       */
      readonly status: "too-large";
      /**
       * 估计的邮件字节数, 含编码膨胀与封装开销.
       */
      readonly estimatedSizeBytes: number;
      /**
       * 设置的单封上限的字节数.
       */
      readonly limitBytes: number;
      /**
       * 去掉附件后重发是否还有意义: 这次备份带了附件时为真.
       */
      readonly canDropAttachments: boolean;
    };

/**
 * 立即备份的请求.
 */
export interface EmailBackupRunRequest {
  /**
   * 是否去掉附件, 超出上限后选择 "去掉附件后再发" 时为真.
   */
  readonly withoutAttachments: boolean;
  /**
   * 用户重新输入的主密码, 保险库没有设主密码时没有这一项.
   */
  readonly masterPassword?: string;
}

/**
 * 上次备份的结果, 持久保存, 供对话框展示与定时备份判断.
 */
export interface EmailBackupLastResult {
  /**
   * 备份尝试结束的时刻, 自 1970 年起的毫秒数.
   */
  readonly completedAt: number;
  /**
   * 成功还是失败.
   */
  readonly outcome: "success" | "failure";
  /**
   * 失败的原因代码, 成功时没有这一项.
   */
  readonly reason?: EmailBackupFailureReason;
}
