import { describe, expect, it } from "vitest";

import {
  bitwardenCard,
  bitwardenExport,
  bitwardenLogin,
  bitwardenNote,
} from "../testing/bitwarden-sample";
import {
  createImportServiceFixture,
  SAMPLE_SOURCE_PATH,
  type ImportServiceFixture,
} from "../testing/import-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { listFolders } from "../folders/folder-repository";
import { findEntry, listEntrySummaries } from "../entries/entry-repository";

/**
 * 样例导出: 一个登录 (收藏, 在文件夹里), 一个安全笔记, 一张卡, 一个类型不支持的条目.
 */
const SAMPLE_EXPORT = bitwardenExport([
  bitwardenLogin(),
  bitwardenNote(),
  bitwardenCard(),
  { type: 6, name: "银行账户" },
]);

/**
 * 把样例导出放进假文件系统.
 * @param fixture 导入服务环境.
 * @param text 文件文本.
 */
function putSample(fixture: ImportServiceFixture, text: string): void {
  fixture.state.files.set(SAMPLE_SOURCE_PATH, Buffer.from(text, "utf8"));
}

describe("导入服务: 选择文件与预览", () => {
  const getDatabase = useVaultDatabase("import-service-preview");

  it("预览只含计数与分布, 并且还没有写库", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    putSample(fixture, SAMPLE_EXPORT);
    const result = await fixture.service.chooseFile("bitwardenJson");
    expect(result).toEqual({
      ok: true,
      value: {
        status: "ready",
        preview: {
          sourceKey: "bitwardenJson",
          totalEntryCount: 4,
          importableEntryCount: 3,
          skippedEntryCount: 1,
          typeCounts: [
            { typeKey: "login", count: 1 },
            { typeKey: "bankCard", count: 1 },
            { typeKey: "secureNote", count: 1 },
          ],
          newFolderCount: 1,
          newTagCount: 0,
          duplicateCount: 0,
          notImportedCount: 2,
        },
      },
    });
    expect(listEntrySummaries(getDatabase().orm)).toEqual([]);
  });
});

describe("导入服务: 预览的脱敏与取消", () => {
  const getDatabase = useVaultDatabase("import-service-preview-safe");

  it("预览里没有任何条目内容", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    putSample(fixture, SAMPLE_EXPORT);
    const result = await fixture.service.chooseFile("bitwardenJson");
    const text = JSON.stringify(result);
    expect(text).not.toContain("FakePassw0rd!");
    expect(text).not.toContain("4242424242424242");
    expect(text).not.toContain("Example Site");
  });

  it("用户取消选择文件对话框时是取消结果, 什么都没有留下", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    fixture.state.openDialogResult = undefined;
    expect(await fixture.service.chooseFile("bitwardenJson")).toEqual({
      ok: true,
      value: { status: "cancelled" },
    });
    expect(fixture.service.run({ duplicatePolicy: "skip" })).toEqual({
      ok: false,
      reason: "no-pending-import",
    });
  });
});

describe("导入服务: 确认导入", () => {
  const getDatabase = useVaultDatabase("import-service-run");

  it("按预览写库, 返回概况与不含保密值的清单", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    putSample(fixture, SAMPLE_EXPORT);
    await fixture.service.chooseFile("bitwardenJson");
    const result = fixture.service.run({ duplicatePolicy: "skip" });
    expect(result).toEqual({
      ok: true,
      value: {
        importedCount: 3,
        skippedDuplicateCount: 0,
        skippedEntryCount: 1,
        createdFolderCount: 1,
        createdTagCount: 0,
        notImported: [
          {
            scope: "entry",
            name: "Example Site",
            reason: "favorite-unsupported",
          },
          { scope: "entry", name: "银行账户", reason: "type-unsupported" },
        ],
      },
    });
    expect(listEntrySummaries(getDatabase().orm)).toHaveLength(3);
    expect(listFolders(getDatabase().orm).map((folder) => folder.name)).toEqual(
      ["Demo/Work"],
    );
    expect(JSON.stringify(result)).not.toContain("FakePassw0rd!");
  });
});

describe("导入服务: 确认导入的结果", () => {
  const getDatabase = useVaultDatabase("import-service-run-result");

  it("写入的条目沿用新建规则, 字段值与导出一致", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    putSample(fixture, SAMPLE_EXPORT);
    await fixture.service.chooseFile("bitwardenJson");
    fixture.service.run({ duplicatePolicy: "skip" });
    const login = listEntrySummaries(getDatabase().orm).find(
      (entry) => entry.name === "Example Site",
    );
    const record = findEntry(getDatabase().orm, login?.id ?? "");
    expect(record?.fields.password).toBe("FakePassw0rd!");
    expect(record?.notesFormat).toBe("plain");
    expect(record?.totp?.algorithm).toBeDefined();
  });

  it("导入结束后释放解析结果, 再次确认报没有等待确认的导入, 进度回到空闲", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    putSample(fixture, SAMPLE_EXPORT);
    await fixture.service.chooseFile("bitwardenJson");
    fixture.service.run({ duplicatePolicy: "skip" });
    expect(fixture.service.run({ duplicatePolicy: "skip" })).toEqual({
      ok: false,
      reason: "no-pending-import",
    });
    expect(fixture.service.getProgress().stage).toBe("idle");
  });
});
