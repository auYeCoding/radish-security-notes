import { Decrypter } from "age-encryption";
import { describe, expect, it } from "vitest";

import {
  SAMPLE_LOGIN_PASSWORD,
  SAMPLE_PDF_BYTES,
  SAMPLE_TOTP_SECRET,
  seedExportSample,
} from "../testing/export-sample-data";
import {
  createExportServiceFixture,
  exportRequestOf,
  SAMPLE_TARGET_PATH,
  type ExportServiceFixture,
} from "../testing/export-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { readZipEntries } from "../testing/zip-test-reader";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 测试用的加密口令.
 */
const PASSPHRASE = "a long enough passphrase";

/**
 * 写入样例并创建导出服务测试环境.
 * @param orm 已解锁数据库的查询入口.
 * @returns 导出服务测试环境.
 */
function seededFixture(orm: VaultOrm): ExportServiceFixture {
  seedExportSample(orm);
  return createExportServiceFixture(() => orm);
}

/**
 * 读出假文件系统里导出的文件.
 * @param fixture 导出服务测试环境.
 * @returns 文件字节.
 */
function exportedBytes(fixture: ExportServiceFixture): Buffer {
  const bytes = fixture.state.files.get(SAMPLE_TARGET_PATH);
  if (bytes === undefined) {
    throw new Error("没有导出文件");
  }
  return bytes;
}

/**
 * 用口令解密导出的文件.
 * @param fixture 导出服务测试环境.
 * @param passphrase 口令.
 * @returns 解密出的明文.
 */
async function decryptExport(
  fixture: ExportServiceFixture,
  passphrase: string,
): Promise<Buffer> {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(passphrase);
  return Buffer.from(
    await decrypter.decrypt(new Uint8Array(exportedBytes(fixture))),
  );
}

describe("导出服务: 口令加密的保存对话框与摘要", () => {
  const getDatabase = useVaultDatabase("export-service-encryption-dialog");

  it("扩展名追加 age, 摘要标明已加密, 不需要明文确认", async () => {
    const fixture = seededFixture(getDatabase().orm);
    const request = exportRequestOf({
      passphrase: PASSPHRASE,
      hasAcknowledgedPlaintextRisk: false,
    });
    const result = await fixture.service.run(request);
    expect(fixture.state.dialogRequests[0]).toMatchObject({
      defaultPath: expect.stringContaining(
        "radish-security-notes-2026-10-05.zip.age",
      ),
      filterName: "export.dialog.filter.encrypted",
      extensions: ["age"],
    });
    expect(result).toMatchObject({
      value: { status: "saved", summary: { isEncrypted: true } },
    });
  }, 30000);
});

describe("导出服务: 没有口令读不出内容", () => {
  const getDatabase = useVaultDatabase("export-service-encryption-secrecy");

  it("密文里找不到任何明文, 错误口令被拒绝", async () => {
    const fixture = seededFixture(getDatabase().orm);
    await fixture.service.run(exportRequestOf({ passphrase: PASSPHRASE }));
    const sealed = exportedBytes(fixture);
    expect(sealed.subarray(0, 21).toString("utf8")).toBe(
      "age-encryption.org/v1",
    );
    const latin = sealed.toString("latin1");
    for (const secret of ["vault.json", SAMPLE_TOTP_SECRET, "示例登录"]) {
      expect(latin).not.toContain(secret);
    }
    await expect(decryptExport(fixture, "not the right one")).rejects.toThrow(
      "no identity matched",
    );
  }, 30000);
});

describe("导出服务: 口令正确时读回", () => {
  const getDatabase = useVaultDatabase("export-service-encryption-roundtrip");

  it("读回的内容与未加密导出完全一致", async () => {
    const plain = seededFixture(getDatabase().orm);
    await plain.service.run(exportRequestOf());
    const sealed = createExportServiceFixture(() => getDatabase().orm);
    await sealed.service.run(exportRequestOf({ passphrase: PASSPHRASE }));
    const plainEntries = readZipEntries(exportedBytes(plain));
    const openedEntries = readZipEntries(
      await decryptExport(sealed, PASSPHRASE),
    );
    expect(openedEntries.map((entry) => entry.name)).toEqual(
      plainEntries.map((entry) => entry.name),
    );
    const vault = JSON.parse(openedEntries[1]?.content.toString("utf8") ?? "");
    expect(vault.entries[0].fields.password).toBe(SAMPLE_LOGIN_PASSWORD);
    expect(openedEntries[2]?.content.equals(SAMPLE_PDF_BYTES)).toBe(true);
  }, 60000);

  it("第三方格式也能加密: Bitwarden JSON 密文解开后是原来的 JSON", async () => {
    const fixture = seededFixture(getDatabase().orm);
    await fixture.service.run(
      exportRequestOf({ format: "bitwardenJson", passphrase: PASSPHRASE }),
    );
    expect(fixture.state.dialogRequests[0]?.defaultPath).toContain(".json.age");
    const text = (await decryptExport(fixture, PASSPHRASE)).toString("utf8");
    expect(JSON.parse(text).encrypted).toBe(false);
  }, 30000);
});

describe("导出服务: 加密导出失败", () => {
  const getDatabase = useVaultDatabase("export-service-encryption-failure");

  it("中途写入失败: 不留文件, 临时文件被删除", async () => {
    const fixture = seededFixture(getDatabase().orm);
    fixture.state.failWriteAfterChunks = 0;
    const result = await fixture.service.run(
      exportRequestOf({ passphrase: PASSPHRASE }),
    );
    expect(result).toEqual({ ok: false, reason: "write-failed" });
    expect(fixture.state.files.size + fixture.state.temporaryFiles.size).toBe(
      0,
    );
  }, 30000);

  it("口令不出现在失败回调收到的错误里, 也不出现在返回值里", async () => {
    const fixture = seededFixture(getDatabase().orm);
    fixture.state.failWriteAfterChunks = 0;
    const result = await fixture.service.run(
      exportRequestOf({ passphrase: PASSPHRASE }),
    );
    const messages = fixture.state.failures
      .map((error) => String((error as Error).message))
      .join();
    expect(JSON.stringify(result)).not.toContain(PASSPHRASE);
    expect(messages).not.toContain(PASSPHRASE);
  }, 30000);
});
