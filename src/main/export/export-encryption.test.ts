import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";

import { Decrypter } from "age-encryption";
import { describe, expect, it } from "vitest";

import { collectStream } from "../testing/export-serializer-fixture";
import {
  encryptExportStream,
  EXPORT_SCRYPT_WORK_FACTOR,
} from "./export-encryption";

/**
 * 测试用的口令, 达到 12 个字符的下限.
 */
const PASSPHRASE = "correct horse battery";

/**
 * 用口令解密一段 age 密文.
 * @param sealed 密文.
 * @param passphrase 口令.
 * @returns 明文.
 */
async function decrypt(sealed: Buffer, passphrase: string): Promise<Buffer> {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(passphrase);
  return Buffer.from(await decrypter.decrypt(new Uint8Array(sealed)));
}

describe("导出口令加密", () => {
  it("scrypt 工作因子是 18, 低于解密方接受的上限 20", () => {
    expect(EXPORT_SCRYPT_WORK_FACTOR).toBe(18);
  });

  it("输出是 age 格式: 头部声明口令派生与工作因子, 口令正确时解出原文", async () => {
    const plain = randomBytes(300000);
    const sealed = await collectStream(
      await encryptExportStream(Readable.from([plain]), PASSPHRASE),
    );
    expect(sealed.subarray(0, 21).toString("utf8")).toBe(
      "age-encryption.org/v1",
    );
    expect(sealed.toString("latin1")).toMatch(/-> scrypt [A-Za-z0-9+/]+ 18\n/);
    expect(sealed.includes(plain.subarray(0, 64))).toBe(false);
    expect((await decrypt(sealed, PASSPHRASE)).equals(plain)).toBe(true);
  }, 30000);

  it("错误口令被明确拒绝, 解不出任何内容", async () => {
    const sealed = await collectStream(
      await encryptExportStream(
        Readable.from([Buffer.from("机密内容")]),
        PASSPHRASE,
      ),
    );
    await expect(decrypt(sealed, "totally wrong passphrase")).rejects.toThrow(
      "no identity matched any of the file's recipients",
    );
  }, 30000);

  it("中文口令按原样使用, 不做规范化, 同一口令可解", async () => {
    const passphrase = "这是一个很长的中文口令字符串";
    const sealed = await collectStream(
      await encryptExportStream(
        Readable.from([Buffer.from("abc")]),
        passphrase,
      ),
    );
    expect((await decrypt(sealed, passphrase)).toString("utf8")).toBe("abc");
  }, 30000);

  it("源流中途出错时加密后的流以错误结束", async () => {
    async function* failing(): AsyncGenerator<Buffer> {
      yield Buffer.from("前半");
      throw new Error("读取失败");
    }
    const encrypted = await encryptExportStream(
      Readable.from(failing()),
      PASSPHRASE,
    );
    await expect(collectStream(encrypted)).rejects.toThrow();
  }, 30000);
});
