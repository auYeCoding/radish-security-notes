import type { EmailBackupProgressSnapshot } from "./email-backup-progress";
import type {
  EmailBackupLastResult,
  EmailBackupResult,
  EmailBackupRunOutcome,
  EmailBackupRunRequest,
} from "./email-backup-result";
import type {
  EmailBackupSettingsInput,
  EmailBackupSettingsView,
} from "./email-backup-settings";

/**
 * preload 暴露给渲染进程的邮箱备份接口. 设置的读写, 备份的生成与发送都在主进程里完成, 渲染端只
 * 送设置, 授权码, 口令与主密码, 只拿到 "已设置" 一类标志, 进度与摘要, 拿不到授权码, 口令与任何
 * 条目内容.
 */
export interface EmailBackupBridge {
  /**
   * 读取已保存的设置, 没保存过时返回默认值.
   * @returns 设置视图, 未解锁时为失败结果.
   */
  getSettings: () => Promise<EmailBackupResult<EmailBackupSettingsView>>;
  /**
   * 保存设置. 设了主密码时要校验重输的主密码; 授权码与口令没给表示保持不变.
   * @param input 设置与新填写的授权码, 口令, 主密码.
   * @returns 保存后的设置视图, 不合规或主密码错误等为失败结果.
   */
  saveSettings: (
    input: EmailBackupSettingsInput,
  ) => Promise<EmailBackupResult<EmailBackupSettingsView>>;
  /**
   * 用已保存的设置发送一封不含任何条目数据的测试邮件.
   * @returns 发送成功为成功结果, 认证失败, 连接失败等为失败结果.
   */
  sendTest: () => Promise<EmailBackupResult<undefined>>;
  /**
   * 立即备份: 生成备份文件, 估计大小, 发送, 记录上次结果.
   * @param request 备份请求.
   * @returns 已发出的摘要, 或估计超出上限而没有发送; 认证失败, 连接失败等为失败结果.
   */
  runBackup: (
    request: EmailBackupRunRequest,
  ) => Promise<EmailBackupResult<EmailBackupRunOutcome>>;
  /**
   * 读取当前备份的进度.
   * @returns 进度快照.
   */
  getProgress: () => Promise<EmailBackupProgressSnapshot>;
  /**
   * 读取上次备份的结果.
   * @returns 上次结果, 从没备份过时为 undefined, 未解锁时为失败结果.
   */
  getLastResult: () => Promise<
    EmailBackupResult<EmailBackupLastResult | undefined>
  >;
}
