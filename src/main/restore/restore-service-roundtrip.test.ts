import { describe, expect, it } from "vitest";

import type { RestoreResult } from "@shared/restore/restore-result";
import type { RestoreOutcome } from "@shared/restore/restore-types";

import { findAttachmentContent } from "../attachments/attachment-content-repository";
import { findEntry } from "../entries/entry-repository";
import { listFolders } from "../folders/folder-repository";
import { listTags } from "../tags/tag-repository";
import { snapshotDatabase } from "../testing/database-snapshot";
import {
  SAMPLE_ATTACHMENT_CONTENTS,
  SAMPLE_ENTRY_IDS,
  SAMPLE_TOTP_SECRET,
} from "../testing/export-sample-data";
import {
  createRestoreFixture,
  prepareChosenBackup,
  SAMPLE_BACKUP_PASSPHRASE,
  useRestoreDatabases,
  type GenerateBackupOptions,
  type RestoreDatabases,
  type RestoreFixture,
} from "../testing/restore-fixture";

/**
 * 只忽略三类标签的创建时间的快照选项: 它们不在备份格式里, 恢复后统一是恢复时刻.
 */
const COMPARABLE = { ignoreLabelCreatedAt: true } as const;

/**
 * 导出样例恢复后的概况.
 */
const SAMPLE_OUTCOME = {
  entryCount: 8,
  folderCount: 3,
  tagCount: 3,
  customTypeCount: 2,
  attachmentCount: 3,
  replacedExistingData: false,
} as const;

/**
 * 备份样例再恢复一次的产出.
 */
interface RestoredSample {
  /**
   * 恢复服务的测试环境.
   */
  readonly fixture: RestoreFixture;
  /**
   * 确认恢复的结果.
   */
  readonly outcome: RestoreResult<RestoreOutcome>;
}

/**
 * 备份样例到备份文件, 再恢复到全新的目标库.
 * @param databases 来源库, 目标库与目录.
 * @param options 是否带附件, 加密口令.
 * @returns 恢复服务的测试环境与恢复的结果.
 */
async function restoreSample(
  databases: RestoreDatabases,
  options: GenerateBackupOptions = {},
): Promise<RestoredSample> {
  const fixture = createRestoreFixture(() => databases.getTarget().orm);
  await prepareChosenBackup(fixture, databases, options);
  await fixture.service.chooseFile();
  if (options.passphrase !== undefined) {
    await fixture.service.submitPassphrase(options.passphrase);
  }
  const outcome = await fixture.service.run({ acknowledgesReplace: false });
  return { fixture, outcome };
}

describe("恢复服务: 明文备份往返到全新的空库", () => {
  const databases = useRestoreDatabases("restore-roundtrip-plain");

  it("恢复的概况如实, 没有触发失败回调", async () => {
    const { outcome, fixture } = await restoreSample(databases);

    expect(outcome).toEqual({ ok: true, value: SAMPLE_OUTCOME });
    expect(fixture.failures).toEqual([]);
  });

  it("预览如实告知备份的计数与标志", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases);

    expect(await fixture.service.chooseFile()).toMatchObject({
      ok: true,
      value: {
        status: "ready",
        preview: {
          isEncrypted: false,
          entryCount: 8,
          attachmentCount: 3,
          includesSecrets: true,
          includesAttachments: true,
          vault: { isEmpty: true },
          requiresMasterPassword: false,
        },
      },
    });
  });
});

describe("恢复服务: 备份前后的数据库快照逐项一致", () => {
  const databases = useRestoreDatabases("restore-roundtrip-snapshot");

  it("明文备份恢复后与备份前一致", async () => {
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases);
    const before = snapshotDatabase(databases.getSource().orm, COMPARABLE);
    await fixture.service.chooseFile();
    await fixture.service.run({ acknowledgesReplace: false });

    expect(snapshotDatabase(databases.getTarget().orm, COMPARABLE)).toBe(
      before,
    );
  });

  it("口令加密的备份输入口令后恢复, 结果同样一致", async () => {
    const options = { passphrase: SAMPLE_BACKUP_PASSPHRASE };
    const { outcome } = await restoreSample(databases, options);

    expect(outcome).toMatchObject({ ok: true, value: { entryCount: 8 } });
    expect(snapshotDatabase(databases.getTarget().orm, COMPARABLE)).toBe(
      snapshotDatabase(databases.getSource().orm, COMPARABLE),
    );
  });
});

describe("恢复服务: 附件, 备注格式, TOTP, 自定义类型与字段逐项还原", () => {
  const databases = useRestoreDatabases("restore-roundtrip-fields");

  it("附件字节与自定义类型条目还原", async () => {
    await restoreSample(databases);
    const target = databases.getTarget().orm;

    for (const [id, content] of SAMPLE_ATTACHMENT_CONTENTS) {
      expect(findAttachmentContent(target, id)?.equals(content)).toBe(true);
    }
    expect(findEntry(target, SAMPLE_ENTRY_IDS.router)).toMatchObject({
      type: "custom:type-1",
      fields: {
        account: "192.168.1.1",
        "field-type-2": "router-secret",
        "field-type-3": "机房左侧\n第二行",
      },
    });
  });

  it("Markdown 备注, TOTP 与自定义字段还原", async () => {
    await restoreSample(databases);
    const target = databases.getTarget().orm;

    expect(findEntry(target, SAMPLE_ENTRY_IDS.forum)).toMatchObject({
      notesFormat: "markdown",
      totp: {
        secret: SAMPLE_TOTP_SECRET,
        algorithm: "SHA256",
        digits: 8,
        periodSeconds: 60,
      },
    });
    expect(findEntry(target, SAMPLE_ENTRY_IDS.login)?.customFields).toEqual([
      { id: "cf-1", label: "密保问题", value: "答案", isHidden: false },
      { id: "cf-2", label: "PIN", value: "9527", isHidden: true },
    ]);
  });
});

describe("恢复服务: 先后顺序与不带附件的备份", () => {
  const databases = useRestoreDatabases("restore-roundtrip-order");

  it("文件夹与标签的先后顺序保持, 创建时间统一为恢复时刻", async () => {
    await restoreSample(databases);
    const target = databases.getTarget().orm;

    expect(listFolders(target).map((folder) => folder.name)).toEqual([
      "工作",
      "Home",
      "没人用",
    ]);
    expect(listTags(target).map((tag) => tag.name)).toEqual([
      "重要",
      "daily",
      "闲置",
    ]);
    expect(new Set(listTags(target).map((tag) => tag.createdAt)).size).toBe(1);
  });

  it("不带附件的备份恢复后条目没有附件, 预览如实告知", async () => {
    const options = { includeAttachments: false };
    const fixture = createRestoreFixture(() => databases.getTarget().orm);
    await prepareChosenBackup(fixture, databases, options);

    const chosen = await fixture.service.chooseFile();
    await fixture.service.run({ acknowledgesReplace: false });

    expect(chosen).toMatchObject({
      value: { preview: { includesAttachments: false, attachmentCount: 0 } },
    });
    expect(
      findAttachmentContent(databases.getTarget().orm, "att-1"),
    ).toBeUndefined();
  });
});
