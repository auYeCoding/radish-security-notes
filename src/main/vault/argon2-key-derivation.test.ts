import { describe, expect, it } from "vitest";

import {
  FAST_ARGON2_PARAMETERS,
  TEST_MASTER_PASSWORD,
} from "../testing/vault-test-fixtures";
import {
  deriveKeyFromPassword,
  generateArgon2Salt,
} from "./argon2-key-derivation";
import { ARGON2_OUTPUT_BYTES, ARGON2_SALT_BYTES } from "./argon2-parameters";

/**
 * 带重音的字母 e 的预组合写法 (U+00E9), 与下面的组合重音写法在 Unicode 里等价.
 */
const PRECOMPOSED_PASSWORD = `caf${String.fromCodePoint(0x00e9)}-password`;

/**
 * 字母 e 加组合重音符 (U+0301) 的写法.
 */
const DECOMPOSED_PASSWORD = `cafe${String.fromCodePoint(0x0301)}-password`;

/**
 * 全角的字母与数字 (U+FF21 起), 与半角写法在 NFKC 下等价.
 */
const FULLWIDTH_PASSWORD = `${String.fromCodePoint(0xff21, 0xff22, 0xff23, 0xff11, 0xff12, 0xff13)}-password`;

/**
 * 用同一个盐派生两个主密码的密钥并比较是否相同.
 * @param first 第一个主密码.
 * @param second 第二个主密码.
 * @returns 派生出的密钥相同时为 true.
 */
async function deriveEqually(first: string, second: string): Promise<boolean> {
  const salt = generateArgon2Salt();
  const [firstKey, secondKey] = await Promise.all(
    [first, second].map((password) =>
      deriveKeyFromPassword({
        password,
        salt,
        parameters: FAST_ARGON2_PARAMETERS,
      }),
    ),
  );
  return firstKey.equals(secondKey);
}

describe("generateArgon2Salt", () => {
  it("生成 16 字节且每次不同的盐", () => {
    const first = generateArgon2Salt();
    const second = generateArgon2Salt();

    expect(first.length).toBe(ARGON2_SALT_BYTES);
    expect(first.equals(second)).toBe(false);
  });
});

describe("deriveKeyFromPassword", () => {
  it("输入相同时派生出相同的 32 字节密钥", async () => {
    const salt = generateArgon2Salt();
    const input = {
      password: TEST_MASTER_PASSWORD,
      salt,
      parameters: FAST_ARGON2_PARAMETERS,
    };

    const first = await deriveKeyFromPassword(input);
    const second = await deriveKeyFromPassword(input);

    expect(first.length).toBe(ARGON2_OUTPUT_BYTES);
    expect(first.equals(second)).toBe(true);
  });

  it("盐不同时派生出不同的密钥", async () => {
    const first = await deriveKeyFromPassword({
      password: TEST_MASTER_PASSWORD,
      salt: generateArgon2Salt(),
      parameters: FAST_ARGON2_PARAMETERS,
    });
    const second = await deriveKeyFromPassword({
      password: TEST_MASTER_PASSWORD,
      salt: generateArgon2Salt(),
      parameters: FAST_ARGON2_PARAMETERS,
    });

    expect(first.equals(second)).toBe(false);
  });

  it("主密码不同时派生出不同的密钥", async () => {
    expect(
      await deriveEqually(TEST_MASTER_PASSWORD, `${TEST_MASTER_PASSWORD}!`),
    ).toBe(false);
  });
});

describe("deriveKeyFromPassword NFKC 规范化", () => {
  it("预组合与组合重音写法的字节不同, 派生出同一个密钥", async () => {
    expect(PRECOMPOSED_PASSWORD).not.toBe(DECOMPOSED_PASSWORD);
    expect(await deriveEqually(PRECOMPOSED_PASSWORD, DECOMPOSED_PASSWORD)).toBe(
      true,
    );
  });

  it("全角与半角写法派生出同一个密钥", async () => {
    expect(FULLWIDTH_PASSWORD).not.toBe("ABC123-password");
    expect(await deriveEqually(FULLWIDTH_PASSWORD, "ABC123-password")).toBe(
      true,
    );
  });

  it("真正不同的主密码仍然派生出不同的密钥", async () => {
    expect(await deriveEqually("cafe-password", "cafe-passworD")).toBe(false);
  });
});
