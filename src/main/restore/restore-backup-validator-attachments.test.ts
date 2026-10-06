import { describe, expect, it } from "vitest";

import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ENTRY,
} from "@shared/attachments/attachment-limits";

import type { ParsedJson } from "../testing/native-export-fixture";
import {
  expectProblems,
  failureAfter,
  loadSampleBackup,
  type ProblemCase,
  type SampleBackup,
} from "../testing/restore-sample-backup";
import { useVaultDatabase } from "../testing/use-vault-database";

/**
 * 样本里登录条目带的第一个附件, 全部附件里的第 1 个.
 * @param backup 备份样本.
 * @returns 第一个附件的声明.
 */
function firstAttachment(backup: SampleBackup): ParsedJson {
  return backup.vault.entries[0].attachments[0];
}

/**
 * 给登录条目追加若干个声明了内容的附件.
 * @param backup 备份样本.
 * @param count 追加的个数.
 * @param size 每个附件声明的字节数.
 */
function appendAttachments(
  backup: SampleBackup,
  count: number,
  size: number,
): void {
  for (let index = 0; index < count; index += 1) {
    const id = `more-${index}`;
    const path = `attachments/${id}`;
    const attachment = {
      id,
      name: `文件 ${index}`,
      size,
      position: 10 + index,
      path,
    };
    backup.vault.entries[0].attachments.push(attachment);
    backup.attachments.set(id, Buffer.alloc(Math.min(size, 4)));
  }
}

/**
 * 附件声明本身不合规: 编号重复或不能用作文件名, 名称为空, 大小不合规, 路径与编号不对应.
 */
const DECLARATION_CASES: readonly ProblemCase[] = [
  {
    set: { "vault.entries.6.attachments.0.id": "att-1" },
    code: "duplicate-id",
    position: 3,
  },
  {
    set: { "vault.entries.0.attachments.0.id": "a/b" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.attachments.0.name": "" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.attachments.0.size": 0 },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.attachments.0.size": MAX_ATTACHMENT_BYTES + 1 },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.attachments.0.path": "attachments/other" },
    code: "invalid-value",
    position: 1,
  },
];

describe("备份校验: 附件声明", () => {
  const getDatabase = useVaultDatabase("restore-validator-attachment-decl");

  it("编号, 名称, 大小或路径不合规时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    expectProblems(base, "attachments", DECLARATION_CASES);
  });

  it("同一个条目的附件顺序号重复时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      b.vault.entries[0].attachments[1].position = 0;
    });

    expect(failure).toMatchObject({
      problem: { section: "attachments", code: "invalid-value" },
    });
  });
});

describe("备份校验: 条目的附件个数与总字节上限", () => {
  const getDatabase = useVaultDatabase("restore-validator-attachment-limit");

  it("一个条目的附件个数超过上限时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      appendAttachments(b, MAX_ATTACHMENTS_PER_ENTRY, 1);
    });

    expect(failure).toMatchObject({
      problem: { section: "attachments", code: "invalid-value" },
    });
  });

  it("一个条目的附件总字节超过上限时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      firstAttachment(b).size = MAX_ATTACHMENT_BYTES;
      b.vault.entries[0].attachments[1].size = MAX_ATTACHMENT_BYTES;
      appendAttachments(b, 3, MAX_ATTACHMENT_BYTES);
    });

    expect(failure).toMatchObject({
      problem: { section: "attachments", code: "invalid-value" },
    });
  });
});

describe("备份校验: 附件内容与压缩包", () => {
  const getDatabase = useVaultDatabase("restore-validator-attachment-content");

  it("声明的附件缺内容时整体拒绝, 指出是第几个附件", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => b.attachments.delete("att-2"));

    expect(failure).toEqual({
      ok: false,
      reason: "invalid-content",
      problem: { section: "attachments", code: "missing-file", position: 2 },
    });
  });

  it("附件内容的大小与声明不符时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) =>
      b.attachments.set("att-1", Buffer.from("短")),
    );

    expect(failure).toMatchObject({
      problem: { section: "attachments", code: "size-mismatch", position: 1 },
    });
  });

  it("压缩包里有声明之外的附件内容时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      b.attachments.set("att-9", Buffer.from("多余"));
    });

    expect(failure).toEqual({
      ok: false,
      reason: "invalid-content",
      problem: { section: "archive", code: "unexpected-file" },
    });
  });

  it("不含附件的备份: 条目没有附件, 压缩包里也没有附件内容", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      b.manifest.includesAttachments = false;
      b.vault.entries.forEach((entry: ParsedJson) => {
        entry.attachments = [];
      });
      b.attachments.clear();
    });

    expect(failure).toBeUndefined();
  });
});
