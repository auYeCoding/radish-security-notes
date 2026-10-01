import { hashRaw } from "@node-rs/argon2";
import Database from "better-sqlite3-multiple-ciphers";
import { describe, expect, it } from "vitest";

/**
 * Argon2id 在 `Algorithm` 枚举中的取值. 该枚举是环境声明的 const enum,
 * 在 isolatedModules 下不能按名字引用, 只能按数值传入.
 */
const ARGON2ID_ALGORITHM = 2;

/**
 * Argon2 版本 0x13 在 `Version` 枚举中的取值, 原因同 `ARGON2ID_ALGORITHM`.
 */
const ARGON2_VERSION_0X13 = 1;

/**
 * Argon2 盐的字节数.
 */
const SALT_LENGTH_BYTES = 16;

/**
 * Argon2 输出的字节数.
 */
const OUTPUT_LENGTH_BYTES = 32;

/**
 * Argon2 的内存开销, 单位千字节, 取小值让测试快速完成.
 */
const MEMORY_COST_KIBIBYTES = 8192;

/**
 * 测试用的 SQLCipher 兼容加密方式名称.
 */
const SQLCIPHER_NAME = "sqlcipher";

describe("原生模块在系统 Node 下可加载", () => {
  it("@node-rs/argon2 能用 Argon2id 派生固定长度的密钥", async () => {
    const derived = await hashRaw("password", {
      algorithm: ARGON2ID_ALGORITHM,
      version: ARGON2_VERSION_0X13,
      salt: Buffer.alloc(SALT_LENGTH_BYTES, 1),
      outputLen: OUTPUT_LENGTH_BYTES,
      memoryCost: MEMORY_COST_KIBIBYTES,
      timeCost: 1,
      parallelism: 1,
    });

    expect(derived.length).toBe(OUTPUT_LENGTH_BYTES);
  });

  it("better-sqlite3-multiple-ciphers 能打开内存库并切换加密方式", () => {
    const database = new Database(":memory:");

    database.pragma(`cipher='${SQLCIPHER_NAME}'`);

    expect(database.pragma("cipher", { simple: true })).toBe(SQLCIPHER_NAME);
    database.close();
  });
});
