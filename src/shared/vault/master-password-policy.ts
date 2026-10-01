/**
 * 主密码允许的最少字符数. 引导页与主进程共用这一个定义.
 */
export const MASTER_PASSWORD_MIN_LENGTH = 8;

/**
 * 判断主密码是否达到最少字符数. 按 Unicode 码点计数, 一个汉字或表情只算一个字符.
 * @param password 待判断的主密码.
 * @returns 达到最少字符数返回 true.
 */
export function isMasterPasswordLongEnough(password: string): boolean {
  return Array.from(password).length >= MASTER_PASSWORD_MIN_LENGTH;
}
