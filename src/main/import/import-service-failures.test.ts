import { describe, expect, it } from "vitest";

import { MAX_TRANSFER_ENTRIES } from "@shared/data-transfer/transfer-limits";

import { listEntrySummaries } from "../entries/entry-repository";
import { listFolders } from "../folders/folder-repository";
import { bitwardenExport, bitwardenLogin } from "../testing/bitwarden-sample";
import {
  createImportServiceFixture,
  SAMPLE_SOURCE_PATH,
  type ImportServiceFixture,
} from "../testing/import-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";

/**
 * 把文本放进假文件系统.
 * @param fixture 导入服务环境.
 * @param bytes 文件内容.
 */
function put(fixture: ImportServiceFixture, bytes: Buffer): void {
  fixture.state.files.set(SAMPLE_SOURCE_PATH, bytes);
}

describe("导入服务: 文件级的失败", () => {
  const getDatabase = useVaultDatabase("import-service-file-failures");

  it("读不到的文件, 空文件, 非 UTF-8 文件各报对应原因, 不写库", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    expect(await fixture.service.chooseFile("bitwardenJson")).toEqual({
      ok: false,
      reason: "file-unreadable",
    });
    put(fixture, Buffer.alloc(0));
    expect(await fixture.service.chooseFile("bitwardenJson")).toEqual({
      ok: false,
      reason: "file-empty",
    });
    put(fixture, Buffer.from([0xff, 0xfe, 0x7b, 0x00]));
    expect(await fixture.service.chooseFile("bitwardenJson")).toEqual({
      ok: false,
      reason: "encoding-unsupported",
    });
    expect(listEntrySummaries(getDatabase().orm)).toEqual([]);
  });

  it("格式不符的文件报格式不符, 没有可导入条目的文件报没有可导入", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    put(fixture, Buffer.from("url,username,password\n", "utf8"));
    expect(await fixture.service.chooseFile("bitwardenCsv")).toEqual({
      ok: false,
      reason: "format-mismatch",
    });
    put(
      fixture,
      Buffer.from(bitwardenExport([{ type: 6, name: "x" }]), "utf8"),
    );
    expect(await fixture.service.chooseFile("bitwardenJson")).toEqual({
      ok: false,
      reason: "no-importable-entries",
    });
  });

  it("条目数超过上限整次拒绝", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    const items = Array.from({ length: MAX_TRANSFER_ENTRIES + 1 }, () => ({
      type: 2,
      name: "n",
      notes: "",
    }));
    put(fixture, Buffer.from(bitwardenExport(items), "utf8"));
    expect(await fixture.service.chooseFile("bitwardenJson")).toEqual({
      ok: false,
      reason: "too-many-entries",
    });
  });
});

describe("导入服务: 事务与未解锁", () => {
  const getDatabase = useVaultDatabase("import-service-transaction");

  it("写库中途出错整个事务回滚, 返回意外失败, 解析结果已释放", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm, 5);
    put(
      fixture,
      Buffer.from(
        bitwardenExport([
          bitwardenLogin(),
          bitwardenLogin({ name: "乙" }),
          bitwardenLogin({ name: "丙" }),
        ]),
        "utf8",
      ),
    );
    await fixture.service.chooseFile("bitwardenJson");
    expect(fixture.service.run({ duplicatePolicy: "skip" })).toEqual({
      ok: false,
      reason: "unexpected-error",
    });
    expect(listEntrySummaries(getDatabase().orm)).toEqual([]);
    expect(listFolders(getDatabase().orm)).toEqual([]);
    expect(fixture.state.failures).toHaveLength(1);
    expect(fixture.service.run({ duplicatePolicy: "skip" })).toEqual({
      ok: false,
      reason: "no-pending-import",
    });
  });

  it("保险库未解锁时选择与确认都失败", async () => {
    const fixture = createImportServiceFixture(() => undefined);
    put(fixture, Buffer.from(bitwardenExport([bitwardenLogin()]), "utf8"));
    expect(await fixture.service.chooseFile("bitwardenJson")).toEqual({
      ok: false,
      reason: "vault-locked",
    });
    expect(fixture.service.run({ duplicatePolicy: "skip" })).toEqual({
      ok: false,
      reason: "no-pending-import",
    });
  });
});
