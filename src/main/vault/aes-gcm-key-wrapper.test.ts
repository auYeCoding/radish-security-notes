import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  KeyUnwrapError,
  unwrapKey,
  wrapKey,
  type WrappedKey,
} from "./aes-gcm-key-wrapper";

/**
 * 测试用的关联数据.
 */
const ASSOCIATED_DATA = Buffer.from("test-context");

/**
 * 一次包裹的测试数据.
 */
interface WrappedFixture {
  /**
   * 被包裹的密钥.
   */
  readonly plainKey: Buffer;
  /**
   * 包裹密钥.
   */
  readonly wrappingKey: Buffer;
  /**
   * 包裹结果.
   */
  readonly wrapped: WrappedKey;
}

/**
 * 翻转一段数据的第一个字节, 模拟被篡改.
 * @param data 原数据.
 * @returns 被改动的副本.
 */
function flipFirstByte(data: Buffer): Buffer {
  const copy = Buffer.from(data);
  copy[0] = copy[0] ^ 0xff;
  return copy;
}

/**
 * 包裹一个随机密钥.
 * @returns 密钥, 包裹密钥与包裹结果.
 */
function createWrappedFixture(): WrappedFixture {
  const plainKey = randomBytes(32);
  const wrappingKey = randomBytes(32);
  const wrapped = wrapKey(plainKey, wrappingKey, ASSOCIATED_DATA);
  return { plainKey, wrappingKey, wrapped };
}

describe("wrapKey 与 unwrapKey 正常使用", () => {
  it("包裹后用同一个包裹密钥能还原", () => {
    const { plainKey, wrappingKey, wrapped } = createWrappedFixture();

    const unwrapped = unwrapKey(wrapped, wrappingKey, ASSOCIATED_DATA);

    expect(unwrapped.equals(plainKey)).toBe(true);
  });

  it("密文不含明文密钥, 且每次包裹的随机数不同", () => {
    const plainKey = randomBytes(32);
    const wrappingKey = randomBytes(32);

    const first = wrapKey(plainKey, wrappingKey, ASSOCIATED_DATA);
    const second = wrapKey(plainKey, wrappingKey, ASSOCIATED_DATA);

    expect(first.ciphertext.equals(plainKey)).toBe(false);
    expect(first.nonce.equals(second.nonce)).toBe(false);
  });
});

describe("unwrapKey 拒绝错误与篡改", () => {
  it("包裹密钥不对时解包失败", () => {
    const { wrapped } = createWrappedFixture();

    expect(() => unwrapKey(wrapped, randomBytes(32), ASSOCIATED_DATA)).toThrow(
      KeyUnwrapError,
    );
  });

  it("关联数据不一致时解包失败", () => {
    const { wrappingKey, wrapped } = createWrappedFixture();

    expect(() =>
      unwrapKey(wrapped, wrappingKey, Buffer.from("other-context")),
    ).toThrow(KeyUnwrapError);
  });

  it("密文被篡改时解包失败", () => {
    const { wrappingKey, wrapped } = createWrappedFixture();
    const tampered = {
      ...wrapped,
      ciphertext: flipFirstByte(wrapped.ciphertext),
    };

    expect(() => unwrapKey(tampered, wrappingKey, ASSOCIATED_DATA)).toThrow(
      KeyUnwrapError,
    );
  });
});

describe("unwrapKey 拒绝被改动的认证信息", () => {
  it("认证标签被篡改时解包失败", () => {
    const { wrappingKey, wrapped } = createWrappedFixture();
    const tampered = { ...wrapped, tag: flipFirstByte(wrapped.tag) };

    expect(() => unwrapKey(tampered, wrappingKey, ASSOCIATED_DATA)).toThrow(
      KeyUnwrapError,
    );
  });

  it("随机数被篡改时解包失败", () => {
    const { wrappingKey, wrapped } = createWrappedFixture();
    const tampered = { ...wrapped, nonce: flipFirstByte(wrapped.nonce) };

    expect(() => unwrapKey(tampered, wrappingKey, ASSOCIATED_DATA)).toThrow(
      KeyUnwrapError,
    );
  });

  it("认证标签被截短时解包失败", () => {
    const { wrappingKey, wrapped } = createWrappedFixture();
    const tampered = { ...wrapped, tag: wrapped.tag.subarray(0, 4) };

    expect(() => unwrapKey(tampered, wrappingKey, ASSOCIATED_DATA)).toThrow(
      KeyUnwrapError,
    );
  });
});
