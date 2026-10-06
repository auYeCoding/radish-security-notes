import { describe, expect, it } from "vitest";

import { insertFolder, renameFolder } from "../folders/folder-repository";
import { insertTag } from "../tags/tag-repository";
import { folders } from "../vault/database/folder-schema";
import { snapshotDatabase } from "./database-snapshot";
import { useVaultDatabase } from "./use-vault-database";

describe("数据库快照", () => {
  const getDatabase = useVaultDatabase("database-snapshot");

  it("默认包含全部列, 创建时间不同就不同", () => {
    const { orm } = getDatabase();
    insertFolder(orm, { id: "f1", name: "工作", createdAt: 1 });
    const first = snapshotDatabase(orm);

    orm.update(folders).set({ createdAt: 2 }).run();

    expect(snapshotDatabase(orm)).not.toBe(first);
  });

  it("可以忽略文件夹, 标签的创建时间, 其余内容仍逐项比较", () => {
    const { orm } = getDatabase();
    insertFolder(orm, { id: "f1", name: "工作", createdAt: 1 });
    insertTag(orm, { id: "t1", name: "重要", color: "red", createdAt: 1 });
    const first = snapshotDatabase(orm, { ignoreLabelCreatedAt: true });

    orm.update(folders).set({ createdAt: 2 }).run();

    expect(snapshotDatabase(orm, { ignoreLabelCreatedAt: true })).toBe(first);
    expect(first).not.toContain("createdAt");
    expect(first).toContain("工作");

    renameFolder(orm, "f1", "改名");

    expect(snapshotDatabase(orm, { ignoreLabelCreatedAt: true })).not.toBe(
      first,
    );
  });
});
