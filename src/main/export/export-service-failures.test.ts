import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { snapshotDatabase } from "../testing/database-snapshot";
import { seedBulkEntries } from "../testing/export-bulk-data";
import { seedExportSample } from "../testing/export-sample-data";
import {
  createExportServiceFixture,
  exportRequestOf,
  SAMPLE_TARGET_PATH,
  type ExportServiceFixture,
} from "../testing/export-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { entryAttachmentContents } from "../vault/database/attachment-schema";
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
 * 断言目标不存在, 也没有遗留的临时文件.
 * @param fixture 导出服务测试环境.
 */
function expectNoFilesLeft(fixture: ExportServiceFixture): void {
  expect(fixture.state.files.size).toBe(0);
  expect(fixture.state.temporaryFiles.size).toBe(0);
}

describe("导出服务: 写文件失败不留下残缺文件", () => {
  const getDatabase = useVaultDatabase("export-service-failures-write");

  it("写入中途磁盘写满: 返回写入失败, 目标不存在, 临时文件被删除", async () => {
    const fixture = seededFixture(getDatabase().orm);
    fixture.state.failWriteAfterChunks = 1;
    expect(await fixture.service.run(exportRequestOf())).toEqual({
      ok: false,
      reason: "write-failed",
    });
    expectNoFilesLeft(fixture);
    expect(fixture.state.removedPaths).toHaveLength(1);
  });

  it("改名失败: 临时文件被删除, 目标原有的文件保持原样", async () => {
    const fixture = seededFixture(getDatabase().orm);
    fixture.state.files.set(SAMPLE_TARGET_PATH, Buffer.from("旧文件"));
    fixture.state.failRename = true;
    expect(await fixture.service.run(exportRequestOf())).toEqual({
      ok: false,
      reason: "write-failed",
    });
    expect(fixture.state.files.get(SAMPLE_TARGET_PATH)?.toString("utf8")).toBe(
      "旧文件",
    );
    expect(fixture.state.temporaryFiles.size).toBe(0);
  });
});

describe("导出服务: 附件缺失与重试", () => {
  const getDatabase = useVaultDatabase("export-service-failures-attachment");

  it("导出途中附件内容已不存在: 整次失败, 失败回调只收到错误", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    orm
      .delete(entryAttachmentContents)
      .where(eq(entryAttachmentContents.attachmentId, "att-2"))
      .run();
    const fixture = createExportServiceFixture(() => orm);
    expect(await fixture.service.run(exportRequestOf())).toEqual({
      ok: false,
      reason: "attachment-missing",
    });
    expectNoFilesLeft(fixture);
    expect(fixture.state.failures).toHaveLength(1);
    const message = String((fixture.state.failures[0] as Error).message);
    expect(message).not.toContain("data.bin");
  });

  it("失败后服务可以再次导出", async () => {
    const fixture = seededFixture(getDatabase().orm);
    fixture.state.failWriteAfterChunks = 0;
    expect(await fixture.service.run(exportRequestOf())).toMatchObject({
      ok: false,
    });
    fixture.state.failWriteAfterChunks = undefined;
    expect(await fixture.service.run(exportRequestOf())).toMatchObject({
      value: { status: "saved" },
    });
    expect(fixture.state.files.size).toBe(1);
  });

  it("失败不改动库里任何数据", async () => {
    const fixture = seededFixture(getDatabase().orm);
    const before = snapshotDatabase(getDatabase().orm);
    fixture.state.failWriteAfterChunks = 1;
    await fixture.service.run(exportRequestOf());
    expect(snapshotDatabase(getDatabase().orm)).toBe(before);
  });
});

describe("导出服务: 中途取消", () => {
  const getDatabase = useVaultDatabase("export-service-failures-cancel");

  it("第三方格式: 返回取消结果, 不留文件, 取消不算失败", async () => {
    const { orm } = getDatabase();
    seedBulkEntries(orm, { count: 600 });
    const fixture = createExportServiceFixture(() => orm);
    fixture.state.onYield = () => fixture.service.cancel();
    const result = await fixture.service.run(
      exportRequestOf({ format: "bitwardenJson" }),
    );
    expect(result).toEqual({ ok: true, value: { status: "cancelled" } });
    expect(fixture.state.yieldCount).toBeGreaterThan(0);
    expectNoFilesLeft(fixture);
    expect(fixture.state.failures).toEqual([]);
    expect(fixture.service.revealFile()).toMatchObject({ ok: false });
  });

  it("本应用格式带附件: 返回取消结果, 不留文件", async () => {
    const { orm } = getDatabase();
    seedBulkEntries(orm, { count: 600, attachmentEvery: 1 });
    const fixture = createExportServiceFixture(() => orm);
    fixture.state.onYield = () => fixture.service.cancel();
    const result = await fixture.service.run(exportRequestOf());
    expect(result).toEqual({ ok: true, value: { status: "cancelled" } });
    expectNoFilesLeft(fixture);
    expect(fixture.state.failures).toEqual([]);
  });
});

describe("导出服务: 取消之后与并发", () => {
  const getDatabase = useVaultDatabase("export-service-failures-after");

  it("取消后服务回到空闲, 可以再次导出", async () => {
    const { orm } = getDatabase();
    seedBulkEntries(orm, { count: 600 });
    const { service, state } = createExportServiceFixture(() => orm);
    state.onYield = () => service.cancel();
    const request = exportRequestOf({ format: "browserCsv" });
    await service.run(request);
    state.onYield = undefined;
    expect(await service.run(request)).toMatchObject({
      value: { status: "saved" },
    });
    expect(service.getProgress().stage).toBe("idle");
  });

  it("导出期间报告有任务进行中, 结束后恢复空闲", async () => {
    const fixture = seededFixture(getDatabase().orm);
    expect(fixture.service.hasRunningTask()).toBe(false);

    const running = fixture.service.run(exportRequestOf());
    expect(fixture.service.hasRunningTask()).toBe(true);
    await running;

    expect(fixture.service.hasRunningTask()).toBe(false);
  });

  it("导出进行时再发起导出返回忙碌, 不影响进行中的导出", async () => {
    const fixture = seededFixture(getDatabase().orm);
    const first = fixture.service.run(exportRequestOf());
    const second = await fixture.service.run(exportRequestOf());
    expect(second).toEqual({ ok: false, reason: "busy" });
    expect(await first).toMatchObject({ value: { status: "saved" } });
    expect(fixture.state.files.size).toBe(1);
  });
});
