import { describe, expect, it } from "vitest";

import {
  createUnlockedAttachmentFixture,
  fileOf,
  listStoredAttachmentIds,
} from "../testing/attachment-service-fixture";
import { injectDatabaseFailure } from "../testing/batch-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("附件服务: 写入中途失败时整批回滚", () => {
  const getHarness = useVaultServiceHarness();

  it("第 3 个文件的内容写入时数据库报错, 前两个文件的元数据与内容也撤回, 返回意外错误并通知回调", async () => {
    const { attachments, entryId, vault, failures } =
      await createUnlockedAttachmentFixture(getHarness());
    injectDatabaseFailure(
      vault,
      "create trigger fail_content before insert on entry_attachment_contents when new.attachment_id = 'att-3' begin select raise(abort, 'injected'); end",
    );

    const result = attachments.insertAll(entryId, [
      fileOf("甲.txt", 1),
      fileOf("乙.txt", 2),
      fileOf("丙.txt", 3),
    ]);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(listStoredAttachmentIds(vault)).toEqual({
      metadata: [],
      contents: [],
    });
    expect(failures).toHaveLength(1);
  });

  it("元数据写入时数据库报错, 同一批已写入的内容也撤回, 失败结果里没有文件名", async () => {
    const { attachments, entryId, vault, failures } =
      await createUnlockedAttachmentFixture(getHarness());
    injectDatabaseFailure(
      vault,
      "create trigger fail_meta before insert on entry_attachments when new.id = 'att-2' begin select raise(abort, 'injected'); end",
    );

    const result = attachments.insertAll(entryId, [
      fileOf("机密文件名甲.txt", 1),
      fileOf("机密文件名乙.txt", 2),
    ]);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(JSON.stringify(result)).not.toContain("机密文件名");
    expect(listStoredAttachmentIds(vault).metadata).toEqual([]);
    expect(failures).toHaveLength(1);
  });
});

describe("附件服务: 回滚之后与删除失败", () => {
  const getHarness = useVaultServiceHarness();

  it("失败回滚之后同一个条目还能正常添加", async () => {
    const { attachments, entryId, vault } =
      await createUnlockedAttachmentFixture(getHarness());
    injectDatabaseFailure(
      vault,
      "create trigger fail_once before insert on entry_attachment_contents begin select raise(abort, 'injected'); end",
    );
    attachments.insertAll(entryId, [fileOf("失败.txt", 1)]);
    injectDatabaseFailure(vault, "drop trigger fail_once");

    const result = attachments.insertAll(entryId, [fileOf("成功.txt", 1)]);

    expect(result.ok).toBe(true);
    expect(listStoredAttachmentIds(vault).metadata).toHaveLength(1);
  });

  it("删除时数据库报错, 附件的元数据与内容都还在", async () => {
    const { attachments, entryId, vault, failures } =
      await createUnlockedAttachmentFixture(getHarness());
    attachments.insertAll(entryId, [fileOf("甲.txt", 1)]);
    injectDatabaseFailure(
      vault,
      "create trigger fail_remove before delete on entry_attachment_contents begin select raise(abort, 'injected'); end",
    );

    const result = attachments.remove("att-1");

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(listStoredAttachmentIds(vault)).toEqual({
      metadata: ["att-1"],
      contents: ["att-1"],
    });
    expect(failures).toHaveLength(1);
  });
});
