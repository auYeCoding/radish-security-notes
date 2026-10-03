import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  createEntryServiceFixture,
  newEntryInputOf,
} from "../testing/entry-service-fixture";
import { createFolderServiceFixture } from "../testing/folder-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

/**
 * 磁盘检查里不应出现在数据库文件中的明文: 文件夹改名前后的名称与被删文件夹的名称.
 */
const DISK_SECRETS = [
  "folder-keep-name",
  "folder-old-name",
  "folder-renamed-name",
  "folder-doomed-name",
  "机密文件夹",
];

describe("文件夹服务: 持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("新建, 改名, 放入条目与删除后关闭重开并解锁, 文件夹与归属保持", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { folders } = createFolderServiceFixture(vault);
    const { entries } = createEntryServiceFixture(vault);
    folders.create("甲");
    folders.create("乙");
    folders.create("丙");
    entries.create(newEntryInputOf({ name: "在乙", folderId: "folder-2" }));
    entries.create(newEntryInputOf({ name: "在丙", folderId: "folder-3" }));
    entries.create(newEntryInputOf({ name: "散件" }));
    folders.rename("folder-1", "甲改");
    folders.remove("folder-3");
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const reopenedFolders = createFolderServiceFixture(reopened).folders;
    const reopenedEntries = createEntryServiceFixture(reopened).entries;

    expect(reopenedFolders.list()).toEqual({
      ok: true,
      value: [
        { id: "folder-1", name: "甲改" },
        { id: "folder-2", name: "乙" },
      ],
    });
    const listed = reopenedEntries.list();
    expect(
      listed.ok &&
        listed.value.map((entry) => [entry.name, entry.folderId ?? "none"]),
    ).toEqual([
      ["散件", "none"],
      ["在丙", "none"],
      ["在乙", "folder-2"],
    ]);
  });
});

describe("文件夹服务: 磁盘上没有明文", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库文件里搜不到文件夹名称, 含改名前的旧名与被删文件夹的名称", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { folders } = createFolderServiceFixture(vault);
    folders.create("folder-keep-name");
    folders.create("folder-old-name");
    folders.create("folder-doomed-name");
    folders.create("机密文件夹");
    folders.rename("folder-2", "folder-renamed-name");
    folders.remove("folder-3");
    vault.close();

    const content = await readFile(harness.paths.databaseFile);

    for (const secret of DISK_SECRETS) {
      expect(content.includes(Buffer.from(secret))).toBe(false);
    }
  });
});
