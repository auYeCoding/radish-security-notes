import { describe, expect, it } from "vitest";

import { MAX_EXPORT_ENTRIES } from "@shared/export/export-limits";

import { insertEntry } from "../entries/entry-repository";
import { seedExportSample } from "../testing/export-sample-data";
import {
  createExportServiceFixture,
  exportRequestOf,
  type ExportServiceFixture,
} from "../testing/export-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
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
 * 写入一个最简单的安全笔记条目.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param index 序号, 决定编号, 名称与创建时间.
 */
function insertBulkNote(orm: VaultOrm, index: number): void {
  insertEntry(orm, {
    id: `bulk-${index}`,
    name: `条目 ${index}`,
    type: "secureNote",
    fields: {},
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: null,
    folderId: null,
    createdAt: index,
  });
}

describe("导出服务: 明文确认与口令校验", () => {
  const getDatabase = useVaultDatabase("export-service-validation-request");

  it("不加密且没确认明文风险时拒绝, 不弹对话框, 不建文件", async () => {
    const { service, state } = seededFixture(getDatabase().orm);
    const result = await service.run(
      exportRequestOf({ hasAcknowledgedPlaintextRisk: false }),
    );
    expect(result).toEqual({ ok: false, reason: "plaintext-not-acknowledged" });
    expect(state.dialogRequests).toEqual([]);
    expect(state.files.size + state.temporaryFiles.size).toBe(0);
  });

  it("加密导出不需要明文确认, 但口令必须合规", async () => {
    const { service, state } = seededFixture(getDatabase().orm);
    for (const passphrase of ["", "short", "a".repeat(11), "a".repeat(1025)]) {
      const request = exportRequestOf({
        passphrase,
        hasAcknowledgedPlaintextRisk: false,
      });
      expect(await service.run(request)).toEqual({
        ok: false,
        reason: "invalid-passphrase",
      });
    }
    expect(state.dialogRequests).toEqual([]);
  });
});

describe("导出服务: 主密码与范围校验", () => {
  const getDatabase = useVaultDatabase("export-service-validation-scope");

  it("设了主密码时, 主密码不对或没给都拒绝, 不弹对话框", async () => {
    const { service, state } = seededFixture(getDatabase().orm);
    const wrong = exportRequestOf({ masterPassword: "wrong" });
    const missing = exportRequestOf({ masterPassword: undefined });
    expect(await service.run(wrong)).toEqual({
      ok: false,
      reason: "wrong-master-password",
    });
    expect(await service.run(missing)).toEqual({
      ok: false,
      reason: "wrong-master-password",
    });
    expect(state.dialogRequests).toEqual([]);
  });

  it("范围里没有任何条目时拒绝: 空保险库, 或指定的编号都不存在", async () => {
    const { service, state } = createExportServiceFixture(
      () => getDatabase().orm,
    );
    const empty = { ok: false, reason: "no-entries" };
    expect(await service.run(exportRequestOf())).toEqual(empty);
    seedExportSample(getDatabase().orm);
    const ghost = exportRequestOf({
      scope: { kind: "entries", entryIds: ["ghost"] },
    });
    expect(await service.run(ghost)).toEqual(empty);
    expect(state.dialogRequests).toEqual([]);
  });

  it("数据库未解锁时返回失败结果, 不弹对话框", async () => {
    const { service, state } = createExportServiceFixture(() => undefined);
    expect(await service.run(exportRequestOf())).toEqual({
      ok: false,
      reason: "vault-locked",
    });
    expect(state.dialogRequests).toEqual([]);
  });
});

describe("导出服务: 条目数上限", () => {
  const getDatabase = useVaultDatabase("export-service-validation-limit");

  it("恰好 10000 条可以导出, 超过 10000 条整次拒绝", async () => {
    const { orm } = getDatabase();
    orm.transaction((transaction) => {
      for (let index = 0; index < MAX_EXPORT_ENTRIES; index += 1) {
        insertBulkNote(transaction, index);
      }
    });
    const { service, state } = createExportServiceFixture(() => orm);
    const request = exportRequestOf({ format: "browserCsv" });
    expect(await service.run(request)).toMatchObject({
      ok: true,
      value: { status: "saved" },
    });
    insertBulkNote(orm, MAX_EXPORT_ENTRIES + 1);
    state.files.clear();
    expect(await service.run(request)).toEqual({
      ok: false,
      reason: "too-many-entries",
    });
    expect(state.files.size).toBe(0);
  }, 30000);
});
