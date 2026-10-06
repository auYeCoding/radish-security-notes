import { describe, expect, it } from "vitest";

import { findAttachmentContent } from "../attachments/attachment-content-repository";
import { findEntry } from "../entries/entry-repository";
import { insertFolder, listFolders } from "../folders/folder-repository";
import { listTags } from "../tags/tag-repository";
import { snapshotDatabase } from "../testing/database-snapshot";
import {
  LEGACY_IDS,
  LEGACY_LAST_RESULT_TIME,
  readLastResultTime,
  seedLegacyVaultContent,
} from "../testing/restore-legacy-data";
import {
  RESTORE_NOW,
  useTargetVaultDatabase,
} from "../testing/restore-fixture";
import {
  loadSampleBackup,
  toRawArchive,
} from "../testing/restore-sample-backup";
import { useVaultDatabase } from "../testing/use-vault-database";
import type { ValidatedBackup } from "./restore-backup-types";
import { validateBackup } from "./restore-backup-validator";
import { writeRestore } from "./restore-writer";
import { clearVaultContent } from "./vault-content-clearer";
import { readVaultState } from "./vault-content-counter";

/**
 * 写入依赖: 固定的时间.
 */
const DEPENDENCIES = { now: () => RESTORE_NOW };

/**
 * 样本里第 7 个条目 (自定义类型的路由器) 带的附件编号在写入时会与第一个条目的重复.
 */
const DUPLICATED_ATTACHMENT_ID = "att-1";

/**
 * 校验导出样本, 得到可以写入的备份.
 * @param backup 备份样本.
 * @returns 校验后的备份.
 * @throws Error 当样本没有通过校验时.
 */
function validatedSample(
  backup: Awaited<ReturnType<typeof loadSampleBackup>>,
): ValidatedBackup {
  const result = validateBackup(toRawArchive(backup));
  if (!result.ok) {
    throw new Error("样本应当通过校验");
  }
  return result.value;
}

/**
 * 让第 7 个条目的附件与第一个条目的附件编号相同, 写入时主键冲突, 用来注入写入中途的失败.
 * @param backup 校验后的备份.
 * @returns 注入了失败的备份.
 */
function withDuplicatedAttachment(backup: ValidatedBackup): ValidatedBackup {
  const entries = backup.document.entries.map((entry, index) =>
    index === 6
      ? {
          ...entry,
          attachments: entry.attachments.map((attachment) => ({
            ...attachment,
            id: DUPLICATED_ATTACHMENT_ID,
          })),
        }
      : entry,
  );
  return { ...backup, document: { ...backup.document, entries } };
}

describe("恢复写入: 空保险库", () => {
  const getSource = useVaultDatabase("restore-writer-source");
  const getTarget = useTargetVaultDatabase("restore-writer-target");

  it("写入全部内容, 备份里的编号原样保留, 不是替换", async () => {
    const backup = validatedSample(await loadSampleBackup(getSource().orm));
    const request = { backup, acknowledgesReplace: false };

    const result = writeRestore(getTarget().orm, request, DEPENDENCIES);

    expect(result).toMatchObject({
      ok: true,
      value: { entryCount: 8, attachmentCount: 3, replacedExistingData: false },
    });
    expect(findEntry(getTarget().orm, "entry-login")?.name).toBe(
      "示例登录, 含逗号",
    );
    expect(findAttachmentContent(getTarget().orm, "att-2")?.length).toBe(256);
  });

  it("文件夹与标签的创建时间统一取传入的时刻", async () => {
    const backup = validatedSample(await loadSampleBackup(getSource().orm));

    writeRestore(
      getTarget().orm,
      { backup, acknowledgesReplace: false },
      DEPENDENCIES,
    );

    const times = [
      ...listFolders(getTarget().orm),
      ...listTags(getTarget().orm),
    ];
    expect(times.every((item) => item.createdAt === RESTORE_NOW)).toBe(true);
  });
});

describe("恢复写入: 空保险库写入中途失败", () => {
  const getSource = useVaultDatabase("restore-writer-fail-source");
  const getTarget = useTargetVaultDatabase("restore-writer-fail-target");

  it("整个事务回滚, 空库保持原样", async () => {
    const backup = validatedSample(await loadSampleBackup(getSource().orm));
    const request = {
      backup: withDuplicatedAttachment(backup),
      acknowledgesReplace: false,
    };
    const before = snapshotDatabase(getTarget().orm);

    expect(() =>
      writeRestore(getTarget().orm, request, DEPENDENCIES),
    ).toThrow();

    expect(snapshotDatabase(getTarget().orm)).toBe(before);
    expect(readVaultState(getTarget().orm).isEmpty).toBe(true);
  });
});

describe("恢复写入: 非空保险库只允许清空后整体替换", () => {
  const getSource = useVaultDatabase("restore-writer-replace-source");
  const getTarget = useTargetVaultDatabase("restore-writer-replace-target");

  it("没有确认替换时拒绝, 库里什么也没有变", async () => {
    const backup = validatedSample(await loadSampleBackup(getSource().orm));
    seedLegacyVaultContent(getTarget().orm);
    const before = snapshotDatabase(getTarget().orm);

    const result = writeRestore(
      getTarget().orm,
      { backup, acknowledgesReplace: false },
      DEPENDENCIES,
    );

    expect(result).toEqual({ ok: false, reason: "replace-not-acknowledged" });
    expect(snapshotDatabase(getTarget().orm)).toBe(before);
  });

  it("确认替换后原有数据全部清空, 只剩备份里的内容, 不属于备份的表不动", async () => {
    const backup = validatedSample(await loadSampleBackup(getSource().orm));
    seedLegacyVaultContent(getTarget().orm);

    const result = writeRestore(
      getTarget().orm,
      { backup, acknowledgesReplace: true },
      DEPENDENCIES,
    );

    const target = getTarget().orm;
    expect(result).toMatchObject({ value: { replacedExistingData: true } });
    expect(findEntry(target, LEGACY_IDS.entry)).toBeUndefined();
    expect(
      findAttachmentContent(target, LEGACY_IDS.attachment),
    ).toBeUndefined();
    expect(readVaultState(target)).toMatchObject({
      entryCount: 8,
      folderCount: 3,
    });
    expect(readLastResultTime(target)).toBe(LEGACY_LAST_RESULT_TIME);
  });
});

describe("恢复写入: 替换时写入中途失败", () => {
  const getSource = useVaultDatabase("restore-writer-replace-fail-source");
  const getTarget = useTargetVaultDatabase(
    "restore-writer-replace-fail-target",
  );

  it("清空也一并回滚, 原有数据保持原样", async () => {
    const backup = validatedSample(await loadSampleBackup(getSource().orm));
    const request = {
      backup: withDuplicatedAttachment(backup),
      acknowledgesReplace: true,
    };
    seedLegacyVaultContent(getTarget().orm);
    const before = snapshotDatabase(getTarget().orm);

    expect(() =>
      writeRestore(getTarget().orm, request, DEPENDENCIES),
    ).toThrow();

    expect(snapshotDatabase(getTarget().orm)).toBe(before);
    expect(findEntry(getTarget().orm, LEGACY_IDS.entry)?.name).toBe("旧条目");
    expect(readLastResultTime(getTarget().orm)).toBe(LEGACY_LAST_RESULT_TIME);
  });
});

describe("保险库内容的统计", () => {
  const getTarget = useTargetVaultDatabase("restore-vault-count");

  it("空库统计为空, 有内容后逐项统计", () => {
    const orm = getTarget().orm;
    const empty = readVaultState(orm);
    seedLegacyVaultContent(orm);

    expect(empty).toEqual({
      isEmpty: true,
      entryCount: 0,
      attachmentCount: 0,
      folderCount: 0,
      tagCount: 0,
      customTypeCount: 0,
    });
    expect(readVaultState(orm)).toMatchObject({
      isEmpty: false,
      entryCount: 1,
      attachmentCount: 1,
      folderCount: 1,
      tagCount: 1,
      customTypeCount: 1,
    });
  });

  it("只有一个文件夹也不算空库", () => {
    const orm = getTarget().orm;
    insertFolder(orm, { id: "only-folder", name: "仅此", createdAt: 1 });

    expect(readVaultState(orm)).toMatchObject({
      isEmpty: false,
      entryCount: 0,
    });
  });
});

describe("保险库内容的清空", () => {
  const getTarget = useTargetVaultDatabase("restore-vault-clear");

  it("清空删除全部业务表的行, 统计为空, 不属于备份的表不动", () => {
    const orm = getTarget().orm;
    seedLegacyVaultContent(orm);

    orm.transaction((transaction) => {
      clearVaultContent(transaction);
    });

    expect(readVaultState(orm).isEmpty).toBe(true);
    expect(snapshotDatabase(orm)).toBe(Array(8).fill("[]").join("\n"));
    expect(readLastResultTime(orm)).toBe(LEGACY_LAST_RESULT_TIME);
  });
});
