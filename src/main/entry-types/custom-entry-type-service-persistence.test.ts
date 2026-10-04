import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  createCustomEntryTypeFixture,
  newCustomTypeInputOf,
} from "../testing/custom-entry-type-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

/**
 * 磁盘检查里不应出现在数据库文件中的明文: 类型名称与字段名.
 */
const DISK_SECRETS = ["磁盘检查类型名", "磁盘检查字段甲", "磁盘检查字段乙"];

describe("自定义类型服务: 持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("新建后关闭重开并解锁, 类型与字段保持原样, 顺序不变", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { customTypes } = createCustomEntryTypeFixture(vault);
    const first = customTypes.create(newCustomTypeInputOf());
    customTypes.create(newCustomTypeInputOf({ name: "交换机" }));
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const listed = createCustomEntryTypeFixture(reopened).customTypes.list();

    expect(listed.ok && listed.value.map((type) => type.name)).toEqual([
      "路由器",
      "交换机",
    ]);
    expect(first.ok && listed.ok && listed.value[0]).toEqual(
      first.ok && first.value,
    );
  });
});

describe("自定义类型服务: 磁盘上没有明文", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库文件里搜不到类型名称与字段名", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { customTypes } = createCustomEntryTypeFixture(vault);
    customTypes.create({
      name: "磁盘检查类型名",
      fields: [
        {
          name: "磁盘检查字段甲",
          kind: "singleLine",
          isSensitive: false,
          isSummary: true,
        },
        {
          name: "磁盘检查字段乙",
          kind: "multiLine",
          isSensitive: true,
          isSummary: false,
        },
      ],
    });
    vault.close();

    const content = await readFile(harness.paths.databaseFile);

    for (const secret of DISK_SECRETS) {
      expect(content.includes(Buffer.from(secret))).toBe(false);
    }
  });
});
