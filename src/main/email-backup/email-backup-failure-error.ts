import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";

/**
 * 邮箱备份失败时写日志用的内部错误. 错误名称带原因码, 日志只写错误名称, 所以日志里能看到失败的
 * 原因, 看不到邮箱地址, 服务器, 授权码, 口令与文件名.
 */
export class EmailBackupFailureError extends Error {
  /**
   * 创建错误.
   * @param reason 失败原因.
   */
  constructor(readonly reason: EmailBackupFailureReason) {
    super(reason);
    this.name = `EmailBackupFailureError:${reason}`;
  }
}
