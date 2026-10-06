/**
 * 一次邮箱备份的触发方式: 用户手动点击, 应用运行期间到点的定时备份, 应用启动并解锁后补发错过的
 * 备份.
 */
export const EMAIL_BACKUP_TRIGGER_KINDS = [
  "manual",
  "scheduled",
  "catch-up",
] as const;

/**
 * 邮箱备份的触发方式.
 */
export type EmailBackupTriggerKind =
  (typeof EMAIL_BACKUP_TRIGGER_KINDS)[number];

/**
 * 不经用户操作的触发方式, 自动备份只会用这两种.
 */
export type UnattendedTriggerKind = Exclude<EmailBackupTriggerKind, "manual">;

/**
 * 没有记录触发方式时的默认值, 0039 留下的上次结果都是手动备份.
 */
export const DEFAULT_EMAIL_BACKUP_TRIGGER_KIND: EmailBackupTriggerKind =
  "manual";

/**
 * 判断一个值是否是登记过的触发方式.
 * @param value 待判断的值.
 * @returns 是登记过的触发方式时返回 true.
 */
export function isEmailBackupTriggerKind(
  value: unknown,
): value is EmailBackupTriggerKind {
  return EMAIL_BACKUP_TRIGGER_KINDS.some((kind) => kind === value);
}
