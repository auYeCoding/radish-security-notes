import { describe, expect, it } from "vitest";

import type { TotpAlgorithm, TotpConfig } from "@shared/entries/totp-config";

import { generateTotpCode } from "./totp-code-generator";

/**
 * RFC 6238 附录 B 的测试向量用的密钥, 是 ASCII 种子的 Base32 形式: SHA1 用 20 字节的
 * 12345678901234567890, SHA256 用 32 字节, SHA512 用 64 字节, 由同一串数字重复得到.
 */
const RFC_SECRETS: Readonly<Record<TotpAlgorithm, string>> = {
  SHA1: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  SHA256: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA",
  SHA512:
    "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA",
};

/**
 * RFC 6238 附录 B 的一行测试向量.
 */
interface RfcVector {
  /**
   * 生成验证码的时刻, 单位秒.
   */
  readonly seconds: number;
  /**
   * 三种算法在这个时刻的 8 位验证码.
   */
  readonly codes: Readonly<Record<TotpAlgorithm, string>>;
}

/**
 * RFC 6238 附录 B 的测试向量: 以秒为单位的时刻, 以及三种算法下 8 位验证码.
 */
const RFC_VECTORS: readonly RfcVector[] = [
  {
    seconds: 59,
    codes: { SHA1: "94287082", SHA256: "46119246", SHA512: "90693936" },
  },
  {
    seconds: 1111111109,
    codes: { SHA1: "07081804", SHA256: "68084774", SHA512: "25091201" },
  },
  {
    seconds: 1111111111,
    codes: { SHA1: "14050471", SHA256: "67062674", SHA512: "99943326" },
  },
  {
    seconds: 1234567890,
    codes: { SHA1: "89005924", SHA256: "91819424", SHA512: "93441116" },
  },
  {
    seconds: 2000000000,
    codes: { SHA1: "69279037", SHA256: "90698825", SHA512: "38618901" },
  },
  {
    seconds: 20000000000,
    codes: { SHA1: "65353130", SHA256: "77737706", SHA512: "47863826" },
  },
];

/**
 * 三种算法的名称, 测试按它们展开.
 */
const ALGORITHMS: readonly TotpAlgorithm[] = ["SHA1", "SHA256", "SHA512"];

/**
 * 用 RFC 附录 B 的密钥构造一个配置.
 * @param algorithm 算法.
 * @param digits 位数.
 * @param periodSeconds 周期, 单位秒.
 * @returns TOTP 配置.
 */
function rfcConfigOf(
  algorithm: TotpAlgorithm,
  digits: 6 | 8 = 8,
  periodSeconds = 30,
): TotpConfig {
  return { secret: RFC_SECRETS[algorithm], algorithm, digits, periodSeconds };
}

describe("generateTotpCode 的 RFC 6238 附录 B 测试向量", () => {
  it.each(ALGORITHMS)(
    "%s 在六个时刻生成与 RFC 一致的 8 位验证码",
    (algorithm) => {
      for (const { seconds, codes } of RFC_VECTORS) {
        const generated = generateTotpCode(
          rfcConfigOf(algorithm),
          seconds * 1000,
        );

        expect(generated.code).toBe(codes[algorithm]);
      }
    },
  );

  it.each(ALGORITHMS)(
    "%s 的 6 位验证码是 8 位验证码的后 6 位, 保留前导零",
    (algorithm) => {
      for (const { seconds, codes } of RFC_VECTORS) {
        const generated = generateTotpCode(
          rfcConfigOf(algorithm, 6),
          seconds * 1000,
        );

        expect(generated.code).toBe(codes[algorithm].slice(2));
      }
    },
  );
});

describe("generateTotpCode 的失效时刻", () => {
  it("失效时刻是下一个周期的开始, 周期开始的那一刻整个周期都有效", () => {
    const config = rfcConfigOf("SHA1");

    expect(generateTotpCode(config, 59000).expiresAt).toBe(60000);
    expect(generateTotpCode(config, 60000).expiresAt).toBe(90000);
    expect(generateTotpCode(config, 60001).expiresAt).toBe(90000);
  });

  it("按配置的周期计算, 并带回周期秒数", () => {
    const config = rfcConfigOf("SHA256", 8, 60);

    const generated = generateTotpCode(config, 100000);

    expect(generated.expiresAt).toBe(120000);
    expect(generated.periodSeconds).toBe(60);
  });

  it("同一个周期内验证码不变, 跨过周期后改变", () => {
    const config = rfcConfigOf("SHA1");

    const first = generateTotpCode(config, 60000);
    const last = generateTotpCode(config, 89999);
    const next = generateTotpCode(config, 90000);

    expect(last.code).toBe(first.code);
    expect(next.code).not.toBe(first.code);
  });
});

describe("generateTotpCode 的输出形态", () => {
  it("验证码是纯数字, 位数与配置一致", () => {
    for (const digits of [6, 8] as const) {
      const generated = generateTotpCode(rfcConfigOf("SHA1", digits), 1234567);

      expect(generated.code).toMatch(new RegExp(`^\\d{${digits}}$`));
    }
  });
});
