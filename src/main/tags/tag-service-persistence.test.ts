import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createEntryServiceFixture,
  newEntryInputOf,
} from "../testing/entry-service-fixture";
import { createTagServiceFixture } from "../testing/tag-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

/**
 * 磁盘检查里不应出现在任何文件中的明文: 标签改名前后的名称与被删标签的名称.
 */
const DISK_SECRETS = [
  "tag-keep-name",
  "tag-old-name",
  "tag-renamed-name",
  "tag-doomed-name",
  "机密标签",
];

describe("标签服务: 持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("新建, 改名, 打标签与删除后关闭重开并解锁, 标签与关联保持", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { tags } = createTagServiceFixture(vault);
    const { entries } = createEntryServiceFixture(vault);
    tags.create("甲", "red");
    tags.create("乙", "blue");
    tags.create("丙", "green");
    entries.create(
      newEntryInputOf({ name: "带甲乙", tagIds: ["tag-2", "tag-1"] }),
    );
    entries.create(newEntryInputOf({ name: "带丙", tagIds: ["tag-3"] }));
    entries.create(newEntryInputOf({ name: "没标签" }));
    tags.update("tag-1", "甲改", "pink");
    tags.remove("tag-3");
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const reopenedTags = createTagServiceFixture(reopened).tags;
    const reopenedEntries = createEntryServiceFixture(reopened).entries;

    expect(reopenedTags.list()).toEqual({
      ok: true,
      value: [
        { id: "tag-1", name: "甲改", color: "pink" },
        { id: "tag-2", name: "乙", color: "blue" },
      ],
    });
    const listed = reopenedEntries.list();
    expect(
      listed.ok &&
        listed.value.map((entry) => [entry.name, entry.tagIds ?? "none"]),
    ).toEqual([
      ["没标签", "none"],
      ["带丙", "none"],
      ["带甲乙", ["tag-2", "tag-1"]],
    ]);
  });
});

describe("标签服务: 磁盘上没有明文", () => {
  const getHarness = useVaultServiceHarness();

  it("用户数据目录的全部文件里搜不到标签名称, 含改名前的旧名与被删标签的名称", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { tags } = createTagServiceFixture(vault);
    const { entries } = createEntryServiceFixture(vault);
    tags.create("tag-keep-name", "red");
    tags.create("tag-old-name", "blue");
    tags.create("tag-doomed-name", "green");
    tags.create("机密标签", "slate");
    tags.update("tag-2", "tag-renamed-name", "blue");
    entries.create(newEntryInputOf({ tagIds: ["tag-1", "tag-2", "tag-4"] }));
    tags.remove("tag-3");
    vault.close();

    const files = await readdir(dirname(harness.paths.directory), {
      recursive: true,
      withFileTypes: true,
    });

    for (const file of files.filter((candidate) => candidate.isFile())) {
      const content = await readFile(join(file.parentPath, file.name));
      for (const secret of DISK_SECRETS) {
        expect(content.includes(Buffer.from(secret))).toBe(false);
      }
    }
    expect(files.some((file) => file.isFile())).toBe(true);
  });
});
