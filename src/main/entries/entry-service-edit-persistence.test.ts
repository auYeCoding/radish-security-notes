import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  createEntryServiceFixture,
  detailOf,
  newEntryInputOf,
  updateEntryInputOf,
} from "../testing/entry-service-fixture";
import {
  prepareMasterPasswordVault,
  startService,
  useVaultServiceHarness,
  type VaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

/**
 * 磁盘检查里不应出现在数据库文件中的明文: 编辑前后的旧值, 新值与被删条目的内容.
 */
const DISK_SECRETS = [
  "edit-old-name",
  "edit-old-account",
  "edit-doomed-name",
  "edit-doomed-account",
  "edit-new-name",
  "edit-new-account",
  "edit-new-p",
  "edit-new-notes",
  "edit-new-label",
  "edit-new-value",
];

/**
 * 在已准备好的主密码保险库里创建两个条目, 编辑第一个, 删除第二个, 然后关闭保险库.
 * @param harness 保险库服务测试环境.
 */
async function editAndRemoveEntries(
  harness: VaultServiceHarness,
): Promise<void> {
  const vault = await startService(harness);
  await vault.unlock(TEST_MASTER_PASSWORD);
  const { entries } = createEntryServiceFixture(vault);
  entries.create(
    newEntryInputOf({
      name: "edit-old-name",
      fields: { account: "edit-old-account", password: "", url: "" },
    }),
  );
  entries.create(
    newEntryInputOf({
      name: "edit-doomed-name",
      fields: { account: "edit-doomed-account", password: "", url: "" },
    }),
  );
  entries.update(
    "id-1",
    updateEntryInputOf({
      name: "edit-new-name",
      fields: { account: "edit-new-account", password: "edit-new-p", url: "" },
      notes: "edit-new-notes",
      customFields: [
        { label: "edit-new-label", value: "edit-new-value", isHidden: true },
      ],
    }),
  );
  entries.remove("id-2");
  vault.close();
}

describe("条目服务: 编辑的持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("编辑后关闭重开并解锁, 条目仍是新值", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { entries } = createEntryServiceFixture(vault);
    entries.create(newEntryInputOf({ name: "旧名称", notes: "旧备注" }));
    entries.update(
      "id-1",
      updateEntryInputOf({
        name: "新名称",
        fields: { account: "new", password: "new-p", url: "" },
        notes: "新备注",
        customFields: [{ label: "字段", value: "值", isHidden: true }],
        totp: "JBSWY3DPEHPK3PXP",
      }),
    );
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const detail = createEntryServiceFixture(reopened).entries.get("id-1");

    expect(detail).toEqual({
      ok: true,
      value: detailOf({
        name: "新名称",
        account: "new",
        fields: { account: "new", password: "new-p", url: "" },
        notes: "新备注",
        customFields: [
          { id: "id-2", label: "字段", value: "值", isHidden: true },
        ],
        hasTotp: true,
      }),
    });
  });
});

describe("条目服务: 删除的持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("删除后关闭重开并解锁, 条目仍然不在, 其它条目仍在", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { entries } = createEntryServiceFixture(vault);
    entries.create(newEntryInputOf({ name: "甲" }));
    entries.create(newEntryInputOf({ name: "乙" }));
    entries.remove("id-1");
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const reopenedEntries = createEntryServiceFixture(reopened).entries;

    expect(reopenedEntries.get("id-1")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(reopenedEntries.list()).toEqual({
      ok: true,
      value: [{ id: "id-2", name: "乙", type: "login", account: "" }],
    });
  });
});

describe("条目服务: 编辑后磁盘上没有明文", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库文件里搜不到编辑后的新值, 也搜不到被删条目的内容", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    await editAndRemoveEntries(harness);

    const content = await readFile(harness.paths.databaseFile);

    for (const secret of DISK_SECRETS) {
      expect(content.includes(Buffer.from(secret))).toBe(false);
    }
  });
});
