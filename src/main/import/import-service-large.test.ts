import { describe, expect, it } from "vitest";

import { listEntrySummaries } from "../entries/entry-repository";
import { bitwardenExport, bitwardenLogin } from "../testing/bitwarden-sample";
import {
  createImportServiceFixture,
  SAMPLE_SOURCE_PATH,
} from "../testing/import-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { IMPORT_CHUNK_SIZE } from "./import-progress";
import type { ImportProgressSnapshot } from "@shared/import/import-types";

/**
 * 大批量测试用的条目个数.
 */
const ENTRY_COUNT = 5000;

/**
 * 整个大批量导入允许的耗时上限, 单位毫秒. 远高于实测值, 只防止退化成明显卡住的量级.
 */
const MAX_ALLOWED_MILLISECONDS = 20000;

/**
 * 生成大批量测试用的条目: 每个都有名称, 账号, 密码, 网址与备注, 三分之一有文件夹.
 * @returns 条目对象列表.
 */
function bulkItems(): Record<string, unknown>[] {
  return Array.from({ length: ENTRY_COUNT }, (_value, index) =>
    bitwardenLogin({
      name: `批量条目 ${index}`,
      favorite: false,
      folderId: index % 3 === 0 ? "00000000-0000-4000-8000-000000000001" : null,
      notes: `备注 ${index}`,
    }),
  );
}

describe("导入服务: 5000 个条目的大批量", () => {
  const getDatabase = useVaultDatabase("import-service-large");

  it("分块处理并报告进度, 全部写入, 耗时在上限内", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    fixture.state.files.set(
      SAMPLE_SOURCE_PATH,
      Buffer.from(bitwardenExport(bulkItems()), "utf8"),
    );
    const samples: ImportProgressSnapshot[] = [];
    fixture.state.onYield = () => samples.push(fixture.service.getProgress());
    const started = performance.now();
    const chosen = await fixture.service.chooseFile("bitwardenJson");
    const written = fixture.service.run({ duplicatePolicy: "skip" });
    const elapsed = performance.now() - started;
    expect(chosen.ok && chosen.value.status).toBe("ready");
    expect(written.ok && written.value.importedCount).toBe(ENTRY_COUNT);
    expect(listEntrySummaries(getDatabase().orm)).toHaveLength(ENTRY_COUNT);
    expect(elapsed).toBeLessThan(MAX_ALLOWED_MILLISECONDS);
    expect(fixture.state.yieldCount).toBeGreaterThanOrEqual(
      Math.floor(ENTRY_COUNT / IMPORT_CHUNK_SIZE) * 2,
    );
    const stages = new Set(samples.map((sample) => sample.stage));
    expect(stages).toEqual(new Set(["parsing", "planning"]));
    expect(samples.every((sample) => sample.total === ENTRY_COUNT)).toBe(true);
  }, 60000);
});
