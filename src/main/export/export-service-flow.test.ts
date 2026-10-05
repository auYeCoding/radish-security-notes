import { describe, expect, it } from "vitest";

import {
  SAMPLE_ENTRY_IDS,
  SAMPLE_LOGIN_PASSWORD,
  SAMPLE_PDF_BYTES,
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

describe("导出服务: 范围统计", () => {
  const getDatabase = useVaultDatabase("export-service-scope");

  it("全部范围: 条目数, 附件个数与字节数, 是否设了主密码", async () => {
    const { service } = seededFixture(getDatabase().orm);
    expect(await service.describeScope({ kind: "all" })).toEqual({
      ok: true,
      value: {
        entryCount: 8,
        attachmentCount: 3,
        attachmentBytes: SAMPLE_PDF_BYTES.length + 256 + 3,
        hasMasterPassword: true,
      },
    });
  });

  it("指定条目的范围: 只统计这些条目, 数据库未解锁时失败", async () => {
    const { service, state } = seededFixture(getDatabase().orm);
    state.hasMasterPassword = false;
    const scope = {
      kind: "entries",
      entryIds: [SAMPLE_ENTRY_IDS.router, "ghost"],
    } as const;
    expect(await service.describeScope(scope)).toEqual({
      ok: true,
      value: {
        entryCount: 1,
        attachmentCount: 1,
        attachmentBytes: 3,
        hasMasterPassword: false,
      },
    });
    const locked = createExportServiceFixture(() => undefined);
    expect(await locked.service.describeScope({ kind: "all" })).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });
});

describe("导出服务: 本应用格式的保存对话框与摘要", () => {
  const getDatabase = useVaultDatabase("export-service-native-summary");

  it("预填默认文件名与过滤器, 写出文件并返回摘要", async () => {
    const fixture = seededFixture(getDatabase().orm);
    const result = await fixture.service.run(exportRequestOf());
    expect(fixture.state.dialogRequests).toEqual([
      {
        title: "export.dialog.saveTitle",
        defaultPath: expect.stringContaining(
          "radish-security-notes-2026-10-05.zip",
        ),
        filterName: "export.dialog.filter.native",
        extensions: ["zip"],
      },
    ]);
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "saved",
        summary: {
          format: "native",
          entryCount: 8,
          attachmentCount: 3,
          fileSizeBytes: exportedBytes(fixture).length,
          includesAttachments: true,
          includesSecrets: true,
          isEncrypted: false,
          losses: [],
        },
      },
    });
    expect(fixture.state.temporaryFiles.size).toBe(0);
  });
});

describe("导出服务: 本应用格式的文件内容", () => {
  const getDatabase = useVaultDatabase("export-service-native-content");

  it("写出的文件是合法的压缩包, 条目与附件和库里一致", async () => {
    const fixture = seededFixture(getDatabase().orm);
    await fixture.service.run(exportRequestOf());
    const entries = readZipEntries(exportedBytes(fixture));
    expect(entries.map((entry) => entry.name)).toEqual([
      "manifest.json",
      "vault.json",
      "attachments/att-1",
      "attachments/att-2",
      "attachments/att-3",
    ]);
    const vault = JSON.parse(entries[1]?.content.toString("utf8") ?? "");
    expect(vault.entries[0].fields.password).toBe(SAMPLE_LOGIN_PASSWORD);
    expect(entries[2]?.content.equals(SAMPLE_PDF_BYTES)).toBe(true);
  });

  it("指定条目的范围, 不含保密字段与附件", async () => {
    const fixture = seededFixture(getDatabase().orm);
    const result = await fixture.service.run(
      exportRequestOf({
        scope: { kind: "entries", entryIds: [SAMPLE_ENTRY_IDS.login] },
        includeSecrets: false,
        includeAttachments: false,
      }),
    );
    expect(result).toMatchObject({
      value: {
        summary: {
          entryCount: 1,
          attachmentCount: 0,
          includesAttachments: false,
          includesSecrets: false,
        },
      },
    });
    const entries = readZipEntries(exportedBytes(fixture));
    expect(entries.map((entry) => entry.name)).toEqual([
      "manifest.json",
      "vault.json",
    ]);
    expect(entries[1]?.content.toString("utf8")).not.toContain(
      SAMPLE_LOGIN_PASSWORD,
    );
  });
});

describe("导出服务: 没设主密码的保险库", () => {
  const getDatabase = useVaultDatabase("export-service-no-master-password");

  it("不需要主密码", async () => {
    const fixture = seededFixture(getDatabase().orm);
    fixture.state.hasMasterPassword = false;
    const result = await fixture.service.run(
      exportRequestOf({ masterPassword: undefined }),
    );
    expect(result).toMatchObject({ ok: true, value: { status: "saved" } });
  });
});

describe("导出服务: Bitwarden JSON", () => {
  const getDatabase = useVaultDatabase("export-service-bitwarden");

  it("扩展名 json, 摘要带出带不出内容的汇总, 不含附件", async () => {
    const fixture = seededFixture(getDatabase().orm);
    const result = await fixture.service.run(
      exportRequestOf({ format: "bitwardenJson" }),
    );
    expect(fixture.state.dialogRequests[0]).toMatchObject({
      defaultPath: expect.stringContaining(
        "radish-security-notes-2026-10-05.json",
      ),
      extensions: ["json"],
    });
    expect(result).toMatchObject({
      value: {
        summary: {
          format: "bitwardenJson",
          entryCount: 8,
          attachmentCount: 0,
          includesAttachments: false,
          losses: [
            { reason: "tags", count: 2 },
            { reason: "attachments", count: 3 },
            { reason: "customEntryTypes", count: 2 },
            { reason: "mergedTypes", count: 3 },
            { reason: "markdownNotes", count: 1 },
          ],
        },
      },
    });
    const document = JSON.parse(exportedBytes(fixture).toString("utf8"));
    expect(document.items).toHaveLength(8);
  });
});

describe("导出服务: 浏览器密码 CSV", () => {
  const getDatabase = useVaultDatabase("export-service-csv");

  it("扩展名 csv, 只写有密码字段的条目", async () => {
    const fixture = seededFixture(getDatabase().orm);
    const result = await fixture.service.run(
      exportRequestOf({ format: "browserCsv" }),
    );
    expect(fixture.state.dialogRequests[0]?.extensions).toEqual(["csv"]);
    expect(result).toMatchObject({
      value: { summary: { format: "browserCsv", entryCount: 2 } },
    });
    const text = exportedBytes(fixture).toString("utf8");
    expect(text.startsWith("name,url,username,password,note\r\n")).toBe(true);
  });
});

describe("导出服务: 取消保存对话框", () => {
  const getDatabase = useVaultDatabase("export-service-dialog-cancel");

  it("不产生文件, 不读数据, 进度回到空闲, 没有可定位的文件", async () => {
    const fixture = seededFixture(getDatabase().orm);
    fixture.state.saveDialogResult = undefined;
    expect(await fixture.service.run(exportRequestOf())).toEqual({
      ok: true,
      value: { status: "cancelled" },
    });
    expect(fixture.state.files.size + fixture.state.temporaryFiles.size).toBe(
      0,
    );
    expect(fixture.service.getProgress().stage).toBe("idle");
    expect(fixture.service.revealFile()).toEqual({
      ok: false,
      reason: "no-finished-export",
    });
  });
});

describe("导出服务: 打开所在文件夹", () => {
  const getDatabase = useVaultDatabase("export-service-reveal");

  it("导出成功后能定位最近一次导出的文件, 取消后忘掉路径", async () => {
    const fixture = seededFixture(getDatabase().orm);
    await fixture.service.run(exportRequestOf());
    expect(fixture.service.revealFile()).toEqual({
      ok: true,
      value: undefined,
    });
    expect(fixture.state.revealedPaths).toEqual([SAMPLE_TARGET_PATH]);
    fixture.service.cancel();
    expect(fixture.service.revealFile()).toEqual({
      ok: false,
      reason: "no-finished-export",
    });
  });

  it("下一次导出开始时忘掉上一次的路径", async () => {
    const fixture = seededFixture(getDatabase().orm);
    await fixture.service.run(exportRequestOf());
    fixture.state.saveDialogResult = undefined;
    await fixture.service.run(exportRequestOf());
    expect(fixture.service.revealFile()).toEqual({
      ok: false,
      reason: "no-finished-export",
    });
  });
});
