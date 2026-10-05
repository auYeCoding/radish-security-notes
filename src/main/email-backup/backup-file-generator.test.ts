import { readFile, readdir } from "node:fs/promises";

import { Decrypter } from "age-encryption";
import { describe, expect, it } from "vitest";

import { snapshotDatabase } from "../testing/database-snapshot";
import {
  createEmailBackupFixture,
  SAMPLE_PASSPHRASE,
} from "../testing/email-backup-fixture";
import { seedExportSample } from "../testing/export-sample-data";
import { exportSampleAsNative } from "../testing/native-export-fixture";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";
import { readZipEntries, type ZipTestEntry } from "../testing/zip-test-reader";
import type { ExportFilePort } from "../export/export-ports";
import { NODE_EXPORT_FILE } from "../export/node-export-file-system";
import { NATIVE_FORMAT_VERSION } from "../export/serializers/native/native-format-version";
import type { GeneratedBackupFile } from "./backup-file-generator";

/**
 * 读出生成好的备份文件的字节.
 * @param file 生成好的备份文件.
 * @returns 文件字节.
 */
function bytesOf(file: GeneratedBackupFile): Promise<Buffer> {
  return readFile(file.filePath);
}

/**
 * 把压缩包里的清单去掉导出时刻后与别的文件放在一起, 便于比较两份压缩包是否同一时刻的内容.
 * @param entries 压缩包里的全部文件.
 * @returns 文件名到内容文本的映射, 清单里的 `createdAt` 已去掉.
 */
function comparableContents(
  entries: readonly ZipTestEntry[],
): Map<string, string> {
  return new Map(
    entries.map((entry) => {
      if (entry.name !== "manifest.json") {
        return [entry.name, entry.content.toString("base64")];
      }
      const manifest = JSON.parse(entry.content.toString("utf8"));
      delete manifest.createdAt;
      return [entry.name, JSON.stringify(manifest)];
    }),
  );
}

/**
 * 用口令解开 age 加密的字节.
 * @param bytes 加密的字节.
 * @param passphrase 口令.
 * @returns 解出的明文字节.
 */
async function decryptWith(bytes: Buffer, passphrase: string): Promise<Buffer> {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(passphrase);
  return Buffer.from(await decrypter.decrypt(new Uint8Array(bytes)));
}

describe("备份文件生成器: 内容与同一时刻的导出一致", () => {
  const getDatabase = useVaultDatabase("backup-generator-content");
  const getDirectory = useTemporaryDirectory("backup-generator-content-dir");

  it("明文备份解包后与导出逐项相等, 格式版本是 1", async () => {
    const { orm } = getDatabase();
    const exported = await exportSampleAsNative(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    const result = await fixture.generator.generate({
      includeAttachments: true,
      passphrase: undefined,
    });
    if (!result.ok) {
      throw new Error("生成失败");
    }
    const entries = readZipEntries(await bytesOf(result.value));
    expect(comparableContents(entries)).toEqual(
      comparableContents(exported.entries),
    );
    const manifest = JSON.parse(entries[0]?.content.toString("utf8") ?? "");
    expect(manifest.version).toBe(NATIVE_FORMAT_VERSION);
    expect(manifest.version).toBe(1);
    expect(result.value).toMatchObject({
      entryCount: exported.payload.entryCount,
      attachmentCount: exported.payload.attachmentCount,
      includesAttachments: true,
      isEncrypted: false,
      fileName: "radish-security-notes-backup-2026-10-05.zip",
    });
    expect(result.value.attachmentCount).toBeGreaterThan(0);
  });
});

describe("备份文件生成器: 保密字段与只读", () => {
  const getDatabase = useVaultDatabase("backup-generator-secrets");
  const getDirectory = useTemporaryDirectory("backup-generator-secrets-dir");

  it("备份含全部保密字段, 与导出全部一致", async () => {
    const { orm } = getDatabase();
    const exported = await exportSampleAsNative(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    const result = await fixture.generator.generate({
      includeAttachments: true,
      passphrase: undefined,
    });
    if (!result.ok) {
      throw new Error("生成失败");
    }
    const entries = readZipEntries(await bytesOf(result.value));
    const vault = entries.find((entry) => entry.name === "vault.json");
    const exportedVault = exported.entries.find(
      (entry) => entry.name === "vault.json",
    );
    expect(vault?.content.toString("utf8")).toBe(
      exportedVault?.content.toString("utf8"),
    );
    expect(exported.dataset.includesSecrets).toBe(true);
  });

  it("生成前后库里没有任何改动", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const before = snapshotDatabase(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await fixture.generator.generate({
      includeAttachments: true,
      passphrase: undefined,
    });
    expect(snapshotDatabase(orm)).toBe(before);
  });
});

describe("备份文件生成器: 附件开关与无法生成", () => {
  const getDatabase = useVaultDatabase("backup-generator-options");
  const getDirectory = useTemporaryDirectory("backup-generator-options-dir");

  it("不含附件时压缩包里没有附件文件, 附件个数为 0", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    const result = await fixture.generator.generate({
      includeAttachments: false,
      passphrase: undefined,
    });
    if (!result.ok) {
      throw new Error("生成失败");
    }
    const names = readZipEntries(await bytesOf(result.value)).map(
      (entry) => entry.name,
    );
    expect(names).toEqual(["manifest.json", "vault.json"]);
    expect(result.value).toMatchObject({
      includesAttachments: false,
      attachmentCount: 0,
    });
  });

  it("没有条目时返回 no-entries 且不留文件", async () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    const result = await fixture.generator.generate({
      includeAttachments: true,
      passphrase: undefined,
    });
    expect(result).toEqual({ ok: false, reason: "no-entries" });
    await expect(readdir(fixture.temporaryDirectory)).rejects.toThrow();
  });

  it("未解锁时返回 vault-locked", async () => {
    const fixture = createEmailBackupFixture(() => undefined, getDirectory());
    const result = await fixture.generator.generate({
      includeAttachments: true,
      passphrase: undefined,
    });
    expect(result).toEqual({ ok: false, reason: "vault-locked" });
  });
});

describe("备份文件生成器: 口令加密", () => {
  const getDatabase = useVaultDatabase("backup-generator-encryption");
  const getDirectory = useTemporaryDirectory("backup-generator-encryption-dir");

  it("文件名追加 age, 没有口令读不出内容, 口令解出后与明文备份一致", async () => {
    const { orm } = getDatabase();
    const exported = await exportSampleAsNative(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    const result = await fixture.generator.generate({
      includeAttachments: true,
      passphrase: SAMPLE_PASSPHRASE,
    });
    if (!result.ok) {
      throw new Error("生成失败");
    }
    const encrypted = await bytesOf(result.value);
    expect(result.value).toMatchObject({
      isEncrypted: true,
      fileName: "radish-security-notes-backup-2026-10-05.zip.age",
    });
    expect(encrypted.subarray(0, 2).toString("latin1")).not.toBe("PK");
    expect(encrypted.includes(Buffer.from("manifest.json"))).toBe(false);
    expect(encrypted.includes(Buffer.from("vault.json"))).toBe(false);
    const plain = await decryptWith(encrypted, SAMPLE_PASSPHRASE);
    expect(comparableContents(readZipEntries(plain))).toEqual(
      comparableContents(exported.entries),
    );
    await expect(
      decryptWith(encrypted, "not the passphrase"),
    ).rejects.toThrow();
  }, 60000);
});

describe("备份文件生成器: 生成失败时清理残留", () => {
  const getDatabase = useVaultDatabase("backup-generator-failure");
  const getDirectory = useTemporaryDirectory("backup-generator-failure-dir");

  it("写文件失败返回 write-failed, 临时目录里没有残留", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const failingFile: ExportFilePort = {
      ...NODE_EXPORT_FILE,
      replaceTarget: () =>
        Promise.reject(Object.assign(new Error("denied"), { code: "EACCES" })),
    };
    const fixture = createEmailBackupFixture(
      () => orm,
      getDirectory(),
      failingFile,
    );
    const result = await fixture.generator.generate({
      includeAttachments: true,
      passphrase: undefined,
    });
    expect(result).toEqual({ ok: false, reason: "write-failed" });
    expect(await readdir(fixture.temporaryDirectory)).toEqual([]);
  });
});
