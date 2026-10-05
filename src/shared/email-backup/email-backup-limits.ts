/**
 * 1 MB 对应的字节数, 邮箱厂商公布的上限与界面里的上限都按 1024 * 1024 字节计.
 */
export const BYTES_PER_MEBIBYTE = 1024 * 1024;

/**
 * 单封邮件大小上限允许填写的最小值, 单位 MB.
 */
export const EMAIL_SIZE_LIMIT_MIN_MEBIBYTES = 1;

/**
 * 单封邮件大小上限允许填写的最大值, 单位 MB.
 */
export const EMAIL_SIZE_LIMIT_MAX_MEBIBYTES = 1024;

/**
 * 邮箱地址允许的最大字符数, 取 RFC 5321 规定的上限.
 */
export const EMAIL_ADDRESS_MAX_LENGTH = 254;

/**
 * 服务器主机名允许的最大字符数, 取 DNS 名称的上限.
 */
export const SMTP_HOST_MAX_LENGTH = 253;

/**
 * 服务器端口允许的最小值.
 */
export const SMTP_PORT_MIN = 1;

/**
 * 服务器端口允许的最大值.
 */
export const SMTP_PORT_MAX = 65535;
