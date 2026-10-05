import { describe, expect, it } from "vitest";

import { snapshotDatabase } from "../testing/database-snapshot";
import { seedBulkEntries } from "../testing/export-bulk-data";
import { seedExportSample } from "../testing/export-sample-data";
import {
  createExportServiceFixture,
  exportRequestOf,
  SAMPLE_TARGET_PATH,
} from "../testing/export-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { readZipEntries } from "../testing/zip-test-reader";
import type { ExportProgressSnapshot } from "@shared/export/export-types";

describe("导出服务: 进度", () => {
  const getDatabase = useVaultDatabase("export-service-progress");

  it("没有导出时进度是空闲, 导出结束后回到空闲", async () => {
    seedExportSample(getDatabase().orm);
    const { service } = createExportServiceFixture(() => getDatabase().orm);
    const idle = { stage: "idle", processed: 0, total: 0 };
    expect(service.getProgress()).toEqual(idle);
    await service.run(exportRequestOf());
    expect(service.getProgress()).toEqual(idle);
  });

  it("导出过程中进度进入写入阶段, 已处理数递增, 总数是条目数加附件数", async () => {
    const { orm } = getDatabase();
    seedBulkEntries(orm, { count: 1000, attachmentEvery: 10 });
    const { service, state } = createExportServiceFixture(() => orm);
    const seen: ExportProgressSnapshot[] = [];
    state.onYield = () => seen.push(service.getProgress());
    await service.run(exportRequestOf());
    expect(seen.length).toBeGreaterThanOrEqual(4);
    expect(seen.every((snapshot) => snapshot.stage === "writing")).toBe(true);
    expect(seen.every((snapshot) => snapshot.total === 1100)).toBe(true);
    const processed = seen.map((snapshot) => snapshot.processed);
    expect([...processed].sort((a, b) => a - b)).toEqual(processed);
    expect(processed[0]).toBeGreaterThan(0);
    expect(processed.at(-1)).toBeLessThanOrEqual(1100);
  });

  it("每 250 个条目让出一次事件循环", async () => {
    const { orm } = getDatabase();
    seedBulkEntries(orm, { count: 1000 });
    const { service, state } = createExportServiceFixture(() => orm);
    await service.run(exportRequestOf({ format: "browserCsv" }));
    expect(state.yieldCount).toBe(4);
  });
});

describe("导出服务: 大批量带附件", () => {
  const getDatabase = useVaultDatabase("export-service-large");

  it("5000 个条目, 其中 500 个带 2 KiB 附件: 导出完整, 让出事件循环, 库内容前后一致", async () => {
    const { orm } = getDatabase();
    const attachmentCount = seedBulkEntries(orm, {
      count: 5000,
      attachmentEvery: 10,
      attachmentBytes: 2048,
    });
    expect(attachmentCount).toBe(500);
    const before = snapshotDatabase(orm);
    const { service, state } = createExportServiceFixture(() => orm);
    const result = await service.run(exportRequestOf());
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "saved",
        summary: { entryCount: 5000, attachmentCount: 500 },
      },
    });
    expect(state.yieldCount).toBeGreaterThanOrEqual(20);
    const entries = readZipEntries(state.files.get(SAMPLE_TARGET_PATH)!);
    expect(entries).toHaveLength(502);
    const vault = JSON.parse(entries[1]!.content.toString("utf8"));
    expect(vault.entries).toHaveLength(5000);
    expect(snapshotDatabase(orm)).toBe(before);
  }, 60000);
});
