import {
  EMAIL_ADDRESS_MAX_LENGTH,
  EMAIL_SIZE_LIMIT_MAX_MEBIBYTES,
  EMAIL_SIZE_LIMIT_MIN_MEBIBYTES,
  SMTP_HOST_MAX_LENGTH,
  SMTP_PORT_MAX,
  SMTP_PORT_MIN,
} from "./email-backup-limits";
import type { EmailBackupSettings } from "./email-backup-settings";

/**
 * 设置里可能出错的字段.
 */
export type EmailBackupField =
  "senderAddress" | "recipientAddress" | "host" | "port" | "sizeLimitMebibytes";

/**
 * 字段出错的方式: 必填没填, 格式不对, 数值超出范围.
 */
export type EmailBackupFieldProblemKind =
  "required" | "invalid" | "out-of-range";

/**
 * 一个字段的问题.
 */
export interface EmailBackupFieldProblem {
  /**
   * 出错的字段.
   */
  readonly field: EmailBackupField;
  /**
   * 出错的方式.
   */
  readonly kind: EmailBackupFieldProblemKind;
}

/**
 * 邮箱地址的基本格式: 一个 @, 两侧都不为空且不含空白, 域名部分带点.
 */
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 服务器主机名的基本格式: 字母, 数字, 点与连字符, 首尾是字母或数字.
 */
const SMTP_HOST_PATTERN = /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/;

/**
 * 判断邮箱地址的格式是否合规.
 * @param value 待判断的地址.
 * @returns 格式合规且长度不超上限时返回 true.
 */
export function isEmailAddressValid(value: string): boolean {
  return (
    value.length <= EMAIL_ADDRESS_MAX_LENGTH &&
    EMAIL_ADDRESS_PATTERN.test(value)
  );
}

/**
 * 检查发件邮箱: 必填且格式合规.
 * @param settings 邮箱备份设置.
 * @returns 有问题时的问题列表, 没有问题时为空.
 */
function checkSenderAddress(
  settings: EmailBackupSettings,
): readonly EmailBackupFieldProblem[] {
  if (settings.senderAddress === "") {
    return [{ field: "senderAddress", kind: "required" }];
  }
  return isEmailAddressValid(settings.senderAddress)
    ? []
    : [{ field: "senderAddress", kind: "invalid" }];
}

/**
 * 检查收件邮箱: 可以不填, 填了就必须格式合规.
 * @param settings 邮箱备份设置.
 * @returns 有问题时的问题列表, 没有问题时为空.
 */
function checkRecipientAddress(
  settings: EmailBackupSettings,
): readonly EmailBackupFieldProblem[] {
  return settings.recipientAddress === "" ||
    isEmailAddressValid(settings.recipientAddress)
    ? []
    : [{ field: "recipientAddress", kind: "invalid" }];
}

/**
 * 检查自定义服务器的地址与端口, 预置类型不检查.
 * @param settings 邮箱备份设置.
 * @returns 有问题时的问题列表, 没有问题时为空.
 */
function checkCustomServer(
  settings: EmailBackupSettings,
): readonly EmailBackupFieldProblem[] {
  if (settings.provider !== "custom") {
    return [];
  }
  const problems: EmailBackupFieldProblem[] = [];
  if (settings.host === "") {
    problems.push({ field: "host", kind: "required" });
  } else if (
    settings.host.length > SMTP_HOST_MAX_LENGTH ||
    !SMTP_HOST_PATTERN.test(settings.host)
  ) {
    problems.push({ field: "host", kind: "invalid" });
  }
  if (
    !Number.isInteger(settings.port) ||
    settings.port < SMTP_PORT_MIN ||
    settings.port > SMTP_PORT_MAX
  ) {
    problems.push({ field: "port", kind: "out-of-range" });
  }
  return problems;
}

/**
 * 检查单封上限: 整数且在允许范围内.
 * @param settings 邮箱备份设置.
 * @returns 有问题时的问题列表, 没有问题时为空.
 */
function checkSizeLimit(
  settings: EmailBackupSettings,
): readonly EmailBackupFieldProblem[] {
  const limit = settings.sizeLimitMebibytes;
  return Number.isInteger(limit) &&
    limit >= EMAIL_SIZE_LIMIT_MIN_MEBIBYTES &&
    limit <= EMAIL_SIZE_LIMIT_MAX_MEBIBYTES
    ? []
    : [{ field: "sizeLimitMebibytes", kind: "out-of-range" }];
}

/**
 * 找出邮箱备份设置里全部不合规的字段. 渲染端用它给字段显示提示, 主进程用它拒绝不合规的保存.
 * @param settings 邮箱备份设置.
 * @returns 问题列表, 全部合规时为空.
 */
export function findEmailBackupSettingsProblems(
  settings: EmailBackupSettings,
): readonly EmailBackupFieldProblem[] {
  return [
    ...checkSenderAddress(settings),
    ...checkRecipientAddress(settings),
    ...checkCustomServer(settings),
    ...checkSizeLimit(settings),
  ];
}
