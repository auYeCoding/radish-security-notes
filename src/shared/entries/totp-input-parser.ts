import { Secret, TOTP, URI } from "otpauth";

import {
  DEFAULT_TOTP_ALGORITHM,
  DEFAULT_TOTP_DIGITS,
  DEFAULT_TOTP_PERIOD_SECONDS,
  isTotpAlgorithm,
  isTotpDigits,
  isTotpPeriodSeconds,
  type TotpConfig,
} from "./totp-config";

/**
 * TOTP 输入校验失败的错误代码, 显示时再换成当前语言的文案.
 */
export const TOTP_INPUT_ERROR_CODES = {
  invalid: "totpInvalid",
  unsupported: "totpUnsupported",
} as const;

/**
 * TOTP 输入校验失败的错误代码的取值.
 */
export type TotpInputErrorCode =
  (typeof TOTP_INPUT_ERROR_CODES)[keyof typeof TOTP_INPUT_ERROR_CODES];

/**
 * TOTP 输入解析成功的结果.
 */
export interface TotpParseSuccess {
  /**
   * 解析是否成功, 成功时恒为 true.
   */
  readonly ok: true;
  /**
   * 解析出的 TOTP 配置.
   */
  readonly config: TotpConfig;
}

/**
 * TOTP 输入解析失败的结果.
 */
export interface TotpParseFailure {
  /**
   * 解析是否成功, 失败时恒为 false.
   */
  readonly ok: false;
  /**
   * 失败的错误代码.
   */
  readonly code: TotpInputErrorCode;
}

/**
 * TOTP 输入的解析结果: 带配置的成功, 或带错误代码的失败.
 */
export type TotpParseResult = TotpParseSuccess | TotpParseFailure;

/**
 * otpauth 链接的开头, 不区分大小写.
 */
const OTPAUTH_LINK_PREFIX = "otpauth://";

/**
 * Base32 密钥里允许出现的空白, 用户常把密钥按四位一组加空格抄写.
 */
const WHITESPACE_PATTERN = /\s/g;

/**
 * 构造解析失败的结果.
 * @param code 错误代码.
 * @returns 失败结果.
 */
function failed(code: TotpInputErrorCode): TotpParseFailure {
  return { ok: false, code };
}

/**
 * 构造解析成功的结果.
 * @param config TOTP 配置.
 * @returns 成功结果.
 */
function succeeded(config: TotpConfig): TotpParseSuccess {
  return { ok: true, config };
}

/**
 * 把 Base32 文本解成密钥.
 * @param base32Text Base32 文本.
 * @returns 密钥, 文本含非法字符或解出的内容为空时为 undefined.
 * @throws Error 当解码抛出的不是 Error 时.
 */
function readSecret(base32Text: string): Secret | undefined {
  try {
    const secret = Secret.fromBase32(base32Text);
    return secret.bytes.length > 0 ? secret : undefined;
  } catch (error) {
    if (error instanceof Error) {
      return undefined;
    }
    throw error;
  }
}

/**
 * 把 otpauth 链接解成一次性口令对象.
 * @param link otpauth 链接.
 * @returns 一次性口令对象, 链接格式不对时为 undefined.
 * @throws Error 当解析抛出的不是 Error 时.
 */
function readLink(link: string): ReturnType<typeof URI.parse> | undefined {
  try {
    return URI.parse(link);
  } catch (error) {
    if (error instanceof Error) {
      return undefined;
    }
    throw error;
  }
}

/**
 * 解析手动输入的 Base32 密钥, 算法, 位数与周期取默认值.
 * @param text 用户输入的密钥文本.
 * @returns 解析结果.
 */
function parseSecretText(text: string): TotpParseResult {
  const secret = readSecret(text.replace(WHITESPACE_PATTERN, ""));
  if (secret === undefined) {
    return failed(TOTP_INPUT_ERROR_CODES.invalid);
  }
  return succeeded({
    secret: secret.base32,
    algorithm: DEFAULT_TOTP_ALGORITHM,
    digits: DEFAULT_TOTP_DIGITS,
    periodSeconds: DEFAULT_TOTP_PERIOD_SECONDS,
  });
}

/**
 * 把解出的 TOTP 对象转成配置, 算法, 位数与周期必须是支持的取值.
 * @param totp 链接解出的 TOTP 对象.
 * @returns 解析结果.
 */
function toConfigResult(totp: TOTP): TotpParseResult {
  const { algorithm, digits, period, secret } = totp;
  if (secret.bytes.length === 0) {
    return failed(TOTP_INPUT_ERROR_CODES.invalid);
  }
  if (
    !isTotpAlgorithm(algorithm) ||
    !isTotpDigits(digits) ||
    !isTotpPeriodSeconds(period)
  ) {
    return failed(TOTP_INPUT_ERROR_CODES.unsupported);
  }
  return succeeded({
    secret: secret.base32,
    algorithm,
    digits,
    periodSeconds: period,
  });
}

/**
 * 解析 otpauth 链接, 只接受 TOTP 类型.
 * @param link 用户输入的链接.
 * @returns 解析结果.
 */
function parseLinkText(link: string): TotpParseResult {
  const parsed = readLink(link);
  if (parsed === undefined) {
    return failed(TOTP_INPUT_ERROR_CODES.invalid);
  }
  if (!(parsed instanceof TOTP)) {
    return failed(TOTP_INPUT_ERROR_CODES.unsupported);
  }
  return toConfigResult(parsed);
}

/**
 * 判断 TOTP 输入是否为空: 去首尾空白后什么也没有, 表示这个条目不带 TOTP.
 * @param input 用户输入的文本.
 * @returns 为空时返回 true.
 */
export function isTotpInputBlank(input: string): boolean {
  return input.trim() === "";
}

/**
 * 解析用户输入的 TOTP: 以 `otpauth://` 开头的当作链接, 取其中的密钥, 算法, 位数与周期; 其余
 * 当作 Base32 密钥, 取默认的 SHA1, 6 位, 30 秒. 渲染端表单与主进程共用, 空输入要先用
 * `isTotpInputBlank` 排除.
 * @param input 用户输入的密钥或链接.
 * @returns 解析结果, 密钥或链接不合法为 `totpInvalid`, 类型, 算法, 位数或周期不支持为
 * `totpUnsupported`.
 */
export function parseTotpInput(input: string): TotpParseResult {
  const text = input.trim();
  return text.toLowerCase().startsWith(OTPAUTH_LINK_PREFIX)
    ? parseLinkText(text)
    : parseSecretText(text);
}
