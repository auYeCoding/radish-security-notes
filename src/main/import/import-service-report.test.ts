import { describe, expect, it } from "vitest";

import { bitwardenExport, bitwardenLogin } from "../testing/bitwarden-sample";
import {
  createImportServiceFixture,
  SAMPLE_REPORT_PATH,
  SAMPLE_SOURCE_PATH,
  type ImportServiceFixture,
} from "../testing/import-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";

/**
 * 建好环境, 放入一个带收藏的登录和一个类型不支持的条目, 选择并确认导入.
 * @param getOrm 取数据库的函数.
 * @returns 已经导入完成的导入服务环境.
 */
async function importedFixture(
  getOrm: Parameters<typeof createImportServiceFixture>[0],
): Promise<ImportServiceFixture> {
  const fixture = createImportServiceFixture(getOrm);
  const items = [bitwardenLogin(), { type: 6, name: "银行账户" }];
  fixture.state.files.set(
    SAMPLE_SOURCE_PATH,
    Buffer.from(bitwardenExport(items), "utf8"),
  );
  await fixture.service.chooseFile("bitwardenJson");
  fixture.service.run({ duplicatePolicy: "skip" });
  return fixture;
}

describe("导入服务: 保存未能带入清单", () => {
  const getDatabase = useVaultDatabase("import-service-report");

  it("写成文本文件, 只含名称, 字段名称与原因, 没有任何保密值", async () => {
    const fixture = await importedFixture(() => getDatabase().orm);
    const result = await fixture.service.saveReport();
    expect(result).toEqual({ ok: true, value: { status: "saved" } });
    const text = fixture.state.writtenFiles.get(SAMPLE_REPORT_PATH) ?? "";
    expect(text).toContain("import.report.title");
    expect(text).toContain("Example Site");
    expect(text).toContain("import.reasons.favorite-unsupported");
    expect(text).toContain("银行账户");
    expect(text).not.toContain("FakePassw0rd!");
    expect(text).not.toContain("JBSWY3DPEHPK3PXP");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("用户取消保存对话框时不写文件, 写出失败时报保存失败并只报错误", async () => {
    const fixture = await importedFixture(() => getDatabase().orm);
    fixture.state.saveDialogResult = undefined;
    expect(await fixture.service.saveReport()).toEqual({
      ok: true,
      value: { status: "cancelled" },
    });
    fixture.state.saveDialogResult = SAMPLE_REPORT_PATH;
    fixture.state.failWrite = true;
    expect(await fixture.service.saveReport()).toEqual({
      ok: false,
      reason: "save-failed",
    });
    expect(fixture.state.writtenFiles.size).toBe(0);
    expect(fixture.state.failures).toHaveLength(1);
  });

  it("没有导入结果时保存与定位都失败", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    expect(await fixture.service.saveReport()).toEqual({
      ok: false,
      reason: "no-pending-import",
    });
    expect(fixture.service.revealFile()).toEqual({
      ok: false,
      reason: "no-pending-import",
    });
  });
});

describe("导入服务: 打开所在文件夹", () => {
  const getDatabase = useVaultDatabase("import-service-reveal");

  it("导入结束后在文件管理器里定位来源文件, 路径只在主进程里", async () => {
    const fixture = await importedFixture(() => getDatabase().orm);
    expect(fixture.service.revealFile()).toEqual({
      ok: true,
      value: undefined,
    });
    expect(fixture.state.revealedPaths).toEqual([SAMPLE_SOURCE_PATH]);
  });

  it("取消后释放保留的信息, 不能再保存或定位", async () => {
    const fixture = await importedFixture(() => getDatabase().orm);
    fixture.service.cancel();
    expect(fixture.service.revealFile().ok).toBe(false);
    expect((await fixture.service.saveReport()).ok).toBe(false);
  });
});
