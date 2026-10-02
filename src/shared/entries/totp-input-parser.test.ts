import { describe, expect, it } from "vitest";

import {
  isTotpAlgorithm,
  isTotpDigits,
  isTotpPeriodSeconds,
  MAX_TOTP_PERIOD_SECONDS,
} from "./totp-config";
import {
  isTotpInputBlank,
  parseTotpInput,
  TOTP_INPUT_ERROR_CODES,
  type TotpParseResult,
} from "./totp-input-parser";

/**
 * 测试用的 Base32 密钥, 解出 10 个字节.
 */
const SECRET = "JBSWY3DPEHPK3PXP";

/**
 * 取出解析失败的错误代码.
 * @param result 解析结果.
 * @returns 错误代码, 解析成功时为 undefined.
 */
function codeOf(result: TotpParseResult): string | undefined {
  return result.ok ? undefined : result.code;
}

describe("parseTotpInput 手动输入的密钥", () => {
  it("合法的 Base32 密钥取默认的 SHA1, 6 位, 30 秒", () => {
    expect(parseTotpInput(SECRET)).toEqual({
      ok: true,
      config: {
        secret: SECRET,
        algorithm: "SHA1",
        digits: 6,
        periodSeconds: 30,
      },
    });
  });

  it("小写, 空格, 换行与补位符被规范成连写的大写密钥", () => {
    const result = parseTotpInput("  jbsw y3dp\nehpk 3pxp==  ");

    expect(result.ok && result.config.secret).toBe(SECRET);
  });

  it.each(["not base32!", "1890", "AB-CD", "AB=CD", "A"])(
    "%s 不是合法密钥, 错误代码是 totpInvalid",
    (input) => {
      expect(codeOf(parseTotpInput(input))).toBe(
        TOTP_INPUT_ERROR_CODES.invalid,
      );
    },
  );

  it("空输入不是合法密钥, 调用方要先判空", () => {
    expect(isTotpInputBlank("")).toBe(true);
    expect(isTotpInputBlank(" \n\t ")).toBe(true);
    expect(isTotpInputBlank(" a ")).toBe(false);
    expect(codeOf(parseTotpInput(""))).toBe(TOTP_INPUT_ERROR_CODES.invalid);
  });
});

describe("parseTotpInput otpauth 链接", () => {
  it("只有密钥时取默认的 SHA1, 6 位, 30 秒, 标签与发行方不保存", () => {
    const result = parseTotpInput(
      `otpauth://totp/ACME:alice@example.test?secret=${SECRET}&issuer=ACME`,
    );

    expect(result).toEqual({
      ok: true,
      config: {
        secret: SECRET,
        algorithm: "SHA1",
        digits: 6,
        periodSeconds: 30,
      },
    });
  });

  it("读取算法, 位数与周期参数, 不区分大小写", () => {
    const result = parseTotpInput(
      `OTPAUTH://TOTP/a?secret=${SECRET.toLowerCase()}&Algorithm=sha512&DIGITS=8&period=60`,
    );

    expect(result).toEqual({
      ok: true,
      config: {
        secret: SECRET,
        algorithm: "SHA512",
        digits: 8,
        periodSeconds: 60,
      },
    });
  });

  it("首尾空白被忽略, 百分号编码的标签可以解析", () => {
    const result = parseTotpInput(
      `  otpauth://totp/%E5%BC%A0%E4%B8%89?secret=${SECRET}\n`,
    );

    expect(result.ok).toBe(true);
  });

  it.each(["SHA256", "SHA512"])("支持算法 %s", (algorithm) => {
    const result = parseTotpInput(
      `otpauth://totp/a?secret=${SECRET}&algorithm=${algorithm}`,
    );

    expect(result.ok && result.config.algorithm).toBe(algorithm);
  });
});

describe("parseTotpInput 不合法的链接", () => {
  it.each([
    "otpauth://totp/a",
    "otpauth://totp/a?secret=",
    "otpauth://totp/a?secret=not base32",
    "otpauth://totp/a?secret=A",
    "otpauth://totp/?secret=JBSWY3DPEHPK3PXP",
    "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&period=0",
    "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&digits=abc",
    "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&algorithm=MD5",
    "otpauth://totp/%E0%A4%A?secret=JBSWY3DPEHPK3PXP",
    "otpauth://unknown/a?secret=JBSWY3DPEHPK3PXP",
    "otpauth://",
  ])("%s 的错误代码是 totpInvalid", (input) => {
    expect(codeOf(parseTotpInput(input))).toBe(TOTP_INPUT_ERROR_CODES.invalid);
  });
});

describe("parseTotpInput 不支持的链接", () => {
  it.each([
    "otpauth://hotp/a?secret=JBSWY3DPEHPK3PXP&counter=1",
    "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&algorithm=SHA224",
    "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&algorithm=SHA384",
    "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&algorithm=SHA3-256",
    "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&digits=7",
    "otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&digits=10",
    `otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&period=${MAX_TOTP_PERIOD_SECONDS + 1}`,
  ])("%s 的错误代码是 totpUnsupported", (input) => {
    expect(codeOf(parseTotpInput(input))).toBe(
      TOTP_INPUT_ERROR_CODES.unsupported,
    );
  });

  it("周期恰好等于上限与 1 秒时通过", () => {
    const longest = parseTotpInput(
      `otpauth://totp/a?secret=${SECRET}&period=${MAX_TOTP_PERIOD_SECONDS}`,
    );
    const shortest = parseTotpInput(
      `otpauth://totp/a?secret=${SECRET}&period=1`,
    );

    expect(longest.ok && longest.config.periodSeconds).toBe(
      MAX_TOTP_PERIOD_SECONDS,
    );
    expect(shortest.ok && shortest.config.periodSeconds).toBe(1);
  });
});

describe("TOTP 配置的取值判断", () => {
  it("算法只认 SHA1, SHA256, SHA512", () => {
    expect(["SHA1", "SHA256", "SHA512"].every(isTotpAlgorithm)).toBe(true);
    expect(["sha1", "SHA224", "MD5", ""].some(isTotpAlgorithm)).toBe(false);
  });

  it("位数只认 6 与 8", () => {
    expect([6, 8].every(isTotpDigits)).toBe(true);
    expect([0, 5, 7, 9, 10].some(isTotpDigits)).toBe(false);
  });

  it("周期是 1 到上限之间的整数", () => {
    expect(
      [1, 30, 60, MAX_TOTP_PERIOD_SECONDS].every(isTotpPeriodSeconds),
    ).toBe(true);
    expect(
      [0, -30, 1.5, Number.NaN, MAX_TOTP_PERIOD_SECONDS + 1].some(
        isTotpPeriodSeconds,
      ),
    ).toBe(false);
  });
});
