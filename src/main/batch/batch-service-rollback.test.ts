import { describe, expect, it } from "vitest";

import {
  countEntryRows,
  createNamedEntries,
  createUnlockedBatchFixture,
  injectDatabaseFailure,
  insertBareEntries,
  listEntryTagRows,
} from "../testing/batch-service-fixture";
import { updateEntryInputOf } from "../testing/entry-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("批量服务: 条目写入中途失败时整批回滚", () => {
  const getHarness = useVaultServiceHarness();

  it("删除到第 3 块编号时数据库报错, 前两块已删的条目也恢复, 返回意外错误并通知回调", async () => {
    const { batch, vault, failures } =
      await createUnlockedBatchFixture(getHarness());
    const ids = insertBareEntries(vault, 1100);
    injectDatabaseFailure(
      vault,
      "create trigger fail_delete before delete on entries when old.id = 'bulk-1050' begin select raise(abort, 'injected'); end",
    );

    const result = batch.removeEntries(ids);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(countEntryRows(vault)).toBe(1100);
    expect(failures).toHaveLength(1);
  });

  it("移入文件夹到第 3 块编号时数据库报错, 前两块已改的条目也恢复原来的归属", async () => {
    const { batch, entries, folders, vault, failures } =
      await createUnlockedBatchFixture(getHarness());
    const ids = insertBareEntries(vault, 1100);
    folders.create("工作");
    injectDatabaseFailure(
      vault,
      "create trigger fail_move before update on entries when new.id = 'bulk-1050' begin select raise(abort, 'injected'); end",
    );

    const result = batch.moveEntries(ids, "folder-1");

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    const listed = entries.list();
    expect(
      listed.ok && listed.value.every((entry) => entry.folderId === undefined),
    ).toBe(true);
    expect(failures).toHaveLength(1);
  });
});

describe("批量服务: 标签关联写入中途失败时整批回滚", () => {
  const getHarness = useVaultServiceHarness();

  it("加标签时数据库报错, 已写入的关联也撤回", async () => {
    const { batch, entries, tags, vault, failures } =
      await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["甲", "乙", "丙"]);
    tags.create("工作", "red");
    injectDatabaseFailure(
      vault,
      "create trigger fail_add before insert on entry_tags when new.entry_id = 'id-3' begin select raise(abort, 'injected'); end",
    );

    const result = batch.addTag(["id-1", "id-2", "id-3"], "tag-1");

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(listEntryTagRows(vault)).toEqual([]);
    expect(failures).toHaveLength(1);
  });

  it("摘标签时数据库报错, 已摘掉的关联也恢复", async () => {
    const { batch, entries, tags, vault, failures } =
      await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["甲", "乙", "丙"]);
    tags.create("工作", "red");
    ["id-1", "id-2", "id-3"].forEach((id, index) =>
      entries.update(
        id,
        updateEntryInputOf({ name: `条目${index}`, tagIds: ["tag-1"] }),
      ),
    );
    injectDatabaseFailure(
      vault,
      "create trigger fail_remove before delete on entry_tags when old.entry_id = 'id-3' begin select raise(abort, 'injected'); end",
    );

    const result = batch.removeTag(["id-1", "id-2", "id-3"], "tag-1");

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(listEntryTagRows(vault)).toHaveLength(3);
    expect(failures).toHaveLength(1);
  });
});

describe("批量服务: 返回给渲染进程的结果", () => {
  const getHarness = useVaultServiceHarness();

  it("失败结果与成功结果只含编号, 不含条目的名称与字段内容", async () => {
    const { batch, entries, tags } =
      await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["机密名称"]);
    tags.create("工作", "red");

    const added = batch.addTag(["id-1"], "tag-1");
    const failed = batch.removeEntries(["id-1", "missing"]);

    expect(JSON.stringify(added)).not.toContain("机密名称");
    expect(JSON.stringify(failed)).not.toContain("机密名称");
  });
});
