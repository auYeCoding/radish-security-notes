import { Readable } from "node:stream";

import { Decrypter } from "age-encryption";
import { beforeAll, describe, expect, it } from "vitest";

import {
  encryptBytes,
  SAMPLE_BACKUP_PASSPHRASE,
} from "../testing/restore-fixture";
import {
  decryptBackup,
  NO_MATCHING_IDENTITY_MESSAGE,
} from "./backup-decryption";
import {
  BackupDamagedError,
  RestoreLimitExceededError,
  WrongPassphraseError,
} from "./restore-errors";

/**
 * 测试用的明文.
 */
const PLAINTEXT = Buffer.from("备份内容 backup content\n".repeat(2000), "utf8");

/**
 * 上限足够大时用的字节数.
 */
const AMPLE_BYTES = 10 * 1024 * 1024;

/**
 * 一个不是正确口令的口令.
 */
const WRONG_PASSPHRASE = "wrong passphrase!!";

/**
 * 解密, 上限足够大.
 * @param bytes 加密的字节.
 * @param passphrase 口令.
 * @returns 解密得到的字节.
 */
function decrypt(bytes: Buffer, passphrase: string): Promise<Buffer> {
  return decryptBackup(Readable.from([bytes]), passphrase, AMPLE_BYTES);
}

/**
 * 把加密字节的最后一个字节附近翻转一位, 造载荷被篡改的文件.
 * @param bytes 加密的字节.
 * @returns 被篡改的字节.
 */
function tamper(bytes: Buffer): Buffer {
  const tampered = Buffer.from(bytes);
  const index = tampered.length - 10;
  tampered[index] = (tampered[index] ?? 0) ^ 0xff;
  return tampered;
}

describe("备份解密: 口令", () => {
  let ciphertext: Buffer;

  beforeAll(async () => {
    ciphertext = await encryptBytes(PLAINTEXT, SAMPLE_BACKUP_PASSPHRASE);
  });

  it("正确的口令解出原文", async () => {
    const decrypted = await decrypt(ciphertext, SAMPLE_BACKUP_PASSPHRASE);

    expect(decrypted.equals(PLAINTEXT)).toBe(true);
  });

  it("口令不对抛错口令错误, 信息与 age-encryption 在这个版本的错口令信息一致", async () => {
    await expect(decrypt(ciphertext, WRONG_PASSPHRASE)).rejects.toBeInstanceOf(
      WrongPassphraseError,
    );

    const decrypter = new Decrypter();
    decrypter.addPassphrase(WRONG_PASSPHRASE);
    await expect(decrypter.decrypt(new Uint8Array(ciphertext))).rejects.toThrow(
      NO_MATCHING_IDENTITY_MESSAGE,
    );
  });
});

describe("备份解密: 损坏与上限", () => {
  let ciphertext: Buffer;

  beforeAll(async () => {
    ciphertext = await encryptBytes(PLAINTEXT, SAMPLE_BACKUP_PASSPHRASE);
  });

  it("头部损坏的加密文件抛损坏错误, 不当成错口令", async () => {
    const header = ciphertext.subarray(0, 24);
    const broken = Buffer.concat([
      header,
      Buffer.from("garbage\n"),
      ciphertext.subarray(60),
    ]);

    await expect(
      decrypt(broken, SAMPLE_BACKUP_PASSPHRASE),
    ).rejects.toBeInstanceOf(BackupDamagedError);
  });

  it("载荷被篡改或被截断的加密文件抛损坏错误", async () => {
    const truncated = ciphertext.subarray(0, ciphertext.length - 200);

    for (const damaged of [tamper(ciphertext), truncated]) {
      await expect(
        decrypt(damaged, SAMPLE_BACKUP_PASSPHRASE),
      ).rejects.toBeInstanceOf(BackupDamagedError);
    }
  });

  it("解密后的字节超过上限时中止并抛超限错误", async () => {
    const source = Readable.from([ciphertext]);
    const limit = PLAINTEXT.length - 1;

    await expect(
      decryptBackup(source, SAMPLE_BACKUP_PASSPHRASE, limit),
    ).rejects.toBeInstanceOf(RestoreLimitExceededError);
  });
});

describe("备份解密: 源流", () => {
  it("解密结束或失败后源流都被销毁", async () => {
    const ciphertext = await encryptBytes(PLAINTEXT, SAMPLE_BACKUP_PASSPHRASE);
    const succeeded = Readable.from([ciphertext]);
    const failed = Readable.from([ciphertext]);

    await decryptBackup(succeeded, SAMPLE_BACKUP_PASSPHRASE, AMPLE_BYTES);
    await decryptBackup(failed, WRONG_PASSPHRASE, AMPLE_BYTES).catch(
      () => undefined,
    );

    expect(succeeded.destroyed).toBe(true);
    expect(failed.destroyed).toBe(true);
  });
});
