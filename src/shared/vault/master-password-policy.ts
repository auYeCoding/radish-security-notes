/**
 * 主密码允许的最少字符数. 引导页与主进程共用这一个定义.
 */
export const MASTER_PASSWORD_MIN_LENGTH = 8;

/**
 * 建议的主密码字符数. 它只用于提示: 拿到密钥文件的人可以离线猜主密码, 越长越难猜出. 最短要求仍是
 * `MASTER_PASSWORD_MIN_LENGTH`, 达不到建议值时不拦截.
 */
export const MASTER_PASSWORD_RECOMMENDED_LENGTH = 12;

/**
 * 判断主密码是否达到最少字符数. 按 Unicode 码点计数, 一个汉字或表情只算一个字符.
 * @param password 待判断的主密码.
 * @returns 达到最少字符数返回 true.
 */
export function isMasterPasswordLongEnough(password: string): boolean {
  return Array.from(password).length >= MASTER_PASSWORD_MIN_LENGTH;
}
