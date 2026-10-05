import { describe, expect, it } from "vitest";

import { bitwardenExport, bitwardenLogin } from "../testing/bitwarden-sample";
import {
  createImportServiceFixture,
  SAMPLE_SOURCE_PATH,
  type ImportServiceFixture,
} from "../testing/import-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";

/**
 * 放入一个登录并选择文件, 等待确认.
 * @param fixture 导入服务环境.
 * @returns 选择文件完成后兑现.
 */
async function chooseLogin(fixture: ImportServiceFixture): Promise<void> {
  fixture.state.files.set(
    SAMPLE_SOURCE_PATH,
    Buffer.from(bitwardenExport([bitwardenLogin()]), "utf8"),
  );
  await fixture.service.chooseFile("bitwardenJson");
}

describe("导入服务: 解析结果的释放", () => {
  const getDatabase = useVaultDatabase("import-service-session");

  it("取消后释放, 不能再确认", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    await chooseLogin(fixture);
    fixture.service.cancel();
    expect(fixture.service.run({ duplicatePolicy: "skip" })).toEqual({
      ok: false,
      reason: "no-pending-import",
    });
  });

  it("超时后释放, 不能再确认", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    await chooseLogin(fixture);
    fixture.state.expiryCallbacks.forEach((expire) => expire());
    expect(fixture.service.run({ duplicatePolicy: "skip" })).toEqual({
      ok: false,
      reason: "no-pending-import",
    });
  });

  it("重新选择文件会替换并释放上一次等待确认的结果", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    await chooseLogin(fixture);
    fixture.state.openDialogResult = undefined;
    await fixture.service.chooseFile("bitwardenJson");
    expect(fixture.service.run({ duplicatePolicy: "skip" }).ok).toBe(false);
  });
});

describe("导入服务: 并发与取消", () => {
  const getDatabase = useVaultDatabase("import-service-busy");

  it("正在选择时再次选择报忙", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    fixture.state.files.set(
      SAMPLE_SOURCE_PATH,
      Buffer.from(bitwardenExport([bitwardenLogin()]), "utf8"),
    );
    const first = fixture.service.chooseFile("bitwardenJson");
    const second = await fixture.service.chooseFile("bitwardenJson");
    expect(second).toEqual({ ok: false, reason: "busy" });
    expect((await first).ok).toBe(true);
  });

  it("解析中途取消, 返回取消结果, 没有留下等待确认的结果", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    const items = Array.from({ length: 600 }, (_value, index) =>
      bitwardenLogin({ name: `条目${index}` }),
    );
    fixture.state.files.set(
      SAMPLE_SOURCE_PATH,
      Buffer.from(bitwardenExport(items), "utf8"),
    );
    fixture.state.onYield = () => fixture.service.cancel();
    expect(await fixture.service.chooseFile("bitwardenJson")).toEqual({
      ok: true,
      value: { status: "cancelled" },
    });
    expect(fixture.service.run({ duplicatePolicy: "skip" }).ok).toBe(false);
    expect(fixture.service.getProgress().stage).toBe("idle");
  });
});
