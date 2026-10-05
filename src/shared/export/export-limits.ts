/**
 * 一次导出最多接受的条目个数, 与导入的条目上限一致, 超过时整次拒绝并建议按范围分批.
 */
export const MAX_EXPORT_ENTRIES = 10000;

/**
 * 范围里最多接受的条目编号个数, 只用来在进程边界挡掉异常大的请求, 超过 `MAX_EXPORT_ENTRIES`
 * 但没有超过它的请求由服务按条目上限拒绝.
 */
export const MAX_EXPORT_SCOPE_IDS = 100000;

/**
 * 单个条目编号允许的最大字符数.
 */
export const MAX_EXPORT_ENTRY_ID_LENGTH = 100;

/**
 * 加密口令允许的最少字符数. 导出文件可能被复制到邮箱, 网盘等处, 会被离线暴力破解, 所以比
 * 主密码的下限更长.
 */
export const EXPORT_PASSPHRASE_MIN_LENGTH = 12;

/**
 * 加密口令与主密码在进程边界允许的最大字符数.
 */
export const EXPORT_SECRET_MAX_LENGTH = 1024;

/**
 * 判断加密口令是否达到最少字符数. 按 Unicode 码点计数, 一个汉字或表情只算一个字符.
 * @param passphrase 待判断的口令.
 * @returns 达到最少字符数返回 true.
 */
export function isExportPassphraseLongEnough(passphrase: string): boolean {
  return Array.from(passphrase).length >= EXPORT_PASSPHRASE_MIN_LENGTH;
}

/**
 * 判断加密口令是否在允许的长度范围内: 不少于最少字符数, 不超过进程边界的上限.
 * @param passphrase 待判断的口令.
 * @returns 长度合规返回 true.
 */
export function isExportPassphraseValid(passphrase: string): boolean {
  return (
    isExportPassphraseLongEnough(passphrase) &&
    passphrase.length <= EXPORT_SECRET_MAX_LENGTH
  );
}
