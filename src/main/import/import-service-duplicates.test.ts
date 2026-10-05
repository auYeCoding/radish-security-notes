import { describe, expect, it } from "vitest";

import { listEntrySummaries } from "../entries/entry-repository";
import { bitwardenExport, bitwardenLogin } from "../testing/bitwarden-sample";
import {
  createImportServiceFixture,
  SAMPLE_SOURCE_PATH,
  type ImportServiceFixture,
} from "../testing/import-service-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";

/**
 * 登录的 username 与 password 都给定的覆盖项.
 * @param username 用户名.
 * @returns 登录条目对象.
 */
function loginOf(username: string): Record<string, unknown> {
  return bitwardenLogin({
    favorite: false,
    login: { username, password: "pw", uris: [{ uri: "https://a.example" }] },
  });
}

/**
 * 导入一份只含给定条目的导出.
 * @param fixture 导入服务环境.
 * @param items 条目对象列表.
 * @param policy 重复条目的处理方式.
 * @returns 确认导入的结果.
 */
async function importItems(
  fixture: ImportServiceFixture,
  items: readonly unknown[],
  policy: "skip" | "import",
): Promise<ReturnType<ImportServiceFixture["service"]["run"]>> {
  fixture.state.files.set(
    SAMPLE_SOURCE_PATH,
    Buffer.from(bitwardenExport(items), "utf8"),
  );
  await fixture.service.chooseFile("bitwardenJson");
  return fixture.service.run({ duplicatePolicy: policy });
}

describe("导入服务: 重复条目的判定", () => {
  const getDatabase = useVaultDatabase("import-service-duplicates");

  it("名称, 账号, 网址都相同才算重复, 忽略英文大小写与首尾空格", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    await importItems(fixture, [loginOf("alice")], "skip");
    fixture.state.files.set(
      SAMPLE_SOURCE_PATH,
      Buffer.from(
        bitwardenExport([
          bitwardenLogin({
            name: " example site ",
            favorite: false,
            login: {
              username: "ALICE",
              password: "x",
              uris: [{ uri: "https://a.example " }],
            },
          }),
          loginOf("bob"),
        ]),
        "utf8",
      ),
    );
    const chosen = await fixture.service.chooseFile("bitwardenJson");
    expect(
      chosen.ok &&
        chosen.value.status === "ready" &&
        chosen.value.preview.duplicateCount,
    ).toBe(1);
  });
});

describe("导入服务: 重复条目的处理", () => {
  const getDatabase = useVaultDatabase("import-service-duplicate-policy");

  it("选跳过时重复条目不写库, 只计数, 其余照常写", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    await importItems(fixture, [loginOf("alice")], "skip");
    const second = await importItems(
      fixture,
      [loginOf("alice"), loginOf("bob")],
      "skip",
    );
    expect(second.ok && second.value.importedCount).toBe(1);
    expect(second.ok && second.value.skippedDuplicateCount).toBe(1);
    expect(listEntrySummaries(getDatabase().orm)).toHaveLength(2);
  });

  it("选仍导入时重复条目照常写入", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    await importItems(fixture, [loginOf("alice")], "skip");
    const second = await importItems(fixture, [loginOf("alice")], "import");
    expect(second.ok && second.value.importedCount).toBe(1);
    expect(second.ok && second.value.skippedDuplicateCount).toBe(0);
    expect(listEntrySummaries(getDatabase().orm)).toHaveLength(2);
  });

  it("文件内部彼此相同的条目不互相判重, 原样导入", async () => {
    const fixture = createImportServiceFixture(() => getDatabase().orm);
    const result = await importItems(
      fixture,
      [loginOf("alice"), loginOf("alice")],
      "skip",
    );
    expect(result.ok && result.value.importedCount).toBe(2);
    expect(result.ok && result.value.skippedDuplicateCount).toBe(0);
  });
});
