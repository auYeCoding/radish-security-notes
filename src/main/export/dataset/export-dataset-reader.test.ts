import { describe, expect, it } from "vitest";

import { snapshotDatabase } from "../../testing/database-snapshot";
import {
  SAMPLE_ENTRY_IDS,
  SAMPLE_LOGIN_PASSWORD,
  SAMPLE_TOTP_SECRET,
  SAMPLE_UNUSED_IDS,
  seedExportSample,
} from "../../testing/export-sample-data";
import { useVaultDatabase } from "../../testing/use-vault-database";
import type { VaultOrm } from "../../vault/database/drizzle-adapter";
import type { ExportDataset } from "./export-dataset";
import {
  readExportDataset,
  type ExportDatasetOptions,
} from "./export-dataset-reader";

/**
 * 默认选项: 全部范围, 含保密字段与附件.
 */
const FULL_OPTIONS: ExportDatasetOptions = {
  scope: { kind: "all" },
  includeSecrets: true,
  includeAttachments: true,
};

/**
 * 写入样例并读出数据集.
 * @param orm 已解锁数据库的查询入口.
 * @param overrides 要覆盖的选项.
 * @returns 数据集.
 */
function seedAndRead(
  orm: VaultOrm,
  overrides: Partial<ExportDatasetOptions> = {},
): ExportDataset {
  seedExportSample(orm);
  return readExportDataset(orm, { ...FULL_OPTIONS, ...overrides });
}

describe("导出数据集: 全部范围的条目", () => {
  const getDatabase = useVaultDatabase("export-dataset-entries");

  it("条目按创建先后升序, 内容与库里一致", () => {
    const dataset = seedAndRead(getDatabase().orm);
    expect(dataset.entries.map((entry) => entry.id)).toEqual([
      ...Object.values(SAMPLE_ENTRY_IDS),
    ]);
    expect(dataset.entries[0]).toMatchObject({
      typeKey: "login",
      name: "示例登录, 含逗号",
      notes: "备注, 含逗号\n第二行",
      notesFormat: "plain",
      folderId: "folder-work",
      tagIds: ["tag-key", "tag-daily"],
      createdAt: 1000,
    });
    expect(dataset.entries[0]?.fields["password"]).toBe(SAMPLE_LOGIN_PASSWORD);
    expect(dataset.entries[0]?.totp?.secret).toBe(SAMPLE_TOTP_SECRET);
    expect(dataset.entries[0]?.customFields).toHaveLength(2);
  });

  it("Markdown 备注与非默认参数的 TOTP 原样读出", () => {
    const dataset = seedAndRead(getDatabase().orm);
    expect(dataset.entries[1]?.notesFormat).toBe("markdown");
    expect(dataset.entries[1]?.totp).toMatchObject({
      algorithm: "SHA256",
      digits: 8,
      periodSeconds: 60,
    });
  });
});

describe("导出数据集: 全部范围的文件夹, 标签与类型", () => {
  const getDatabase = useVaultDatabase("export-dataset-labels");

  it("带上全部文件夹, 标签与自定义类型, 含没人用的", () => {
    const dataset = seedAndRead(getDatabase().orm);
    expect(dataset.isFullScope).toBe(true);
    expect(dataset.folders.map((folder) => folder.name)).toEqual([
      "工作",
      "Home",
      "没人用",
    ]);
    expect(dataset.tags.map((tag) => tag.id)).toEqual([
      "tag-key",
      "tag-daily",
      SAMPLE_UNUSED_IDS.tag,
    ]);
    expect(dataset.customEntryTypes.map((type) => type.id)).toEqual([
      "type-1",
      SAMPLE_UNUSED_IDS.customType,
    ]);
  });

  it("自定义类型的字段按显示顺序, 附件元数据按添加顺序且不含内容", () => {
    const dataset = seedAndRead(getDatabase().orm);
    expect(dataset.customEntryTypes[0]?.fields.map((f) => f.key)).toEqual([
      "account",
      "field-type-2",
      "field-type-3",
    ]);
    const names = dataset.entries[0]?.attachments.map((item) => item.name);
    expect(names).toEqual(["报告 final.pdf", "data.bin"]);
    expect(JSON.stringify(dataset)).not.toContain("%PDF");
  });
});

describe("导出数据集: 只读", () => {
  const getDatabase = useVaultDatabase("export-dataset-readonly");

  it("读取不改动库里任何数据", () => {
    seedExportSample(getDatabase().orm);
    const before = snapshotDatabase(getDatabase().orm);
    readExportDataset(getDatabase().orm, {
      ...FULL_OPTIONS,
      includeSecrets: false,
    });
    expect(snapshotDatabase(getDatabase().orm)).toBe(before);
  });
});

describe("导出数据集: 指定条目的范围", () => {
  const getDatabase = useVaultDatabase("export-dataset-selection");

  it("只留指定条目, 保持创建顺序, 不存在的编号被忽略", () => {
    const dataset = seedAndRead(getDatabase().orm, {
      scope: {
        kind: "entries",
        entryIds: [SAMPLE_ENTRY_IDS.router, SAMPLE_ENTRY_IDS.login, "ghost"],
      },
    });
    expect(dataset.isFullScope).toBe(false);
    expect(dataset.entries.map((entry) => entry.id)).toEqual([
      SAMPLE_ENTRY_IDS.login,
      SAMPLE_ENTRY_IDS.router,
    ]);
  });

  it("只带这些条目用到的文件夹, 标签与自定义类型", () => {
    const dataset = seedAndRead(getDatabase().orm, {
      scope: {
        kind: "entries",
        entryIds: [SAMPLE_ENTRY_IDS.router, SAMPLE_ENTRY_IDS.login],
      },
    });
    expect(dataset.folders.map((folder) => folder.id)).toEqual([
      "folder-work",
      "folder-home",
    ]);
    expect(dataset.tags.map((tag) => tag.id)).toEqual(["tag-key", "tag-daily"]);
    expect(dataset.customEntryTypes.map((type) => type.id)).toEqual(["type-1"]);
  });
});

describe("导出数据集: 条目没用到标签与类型", () => {
  const getDatabase = useVaultDatabase("export-dataset-no-labels");

  it("不带文件夹, 标签与自定义类型", () => {
    const dataset = seedAndRead(getDatabase().orm, {
      scope: { kind: "entries", entryIds: [SAMPLE_ENTRY_IDS.wifi] },
    });
    expect(dataset.folders).toEqual([]);
    expect(dataset.tags).toEqual([]);
    expect(dataset.customEntryTypes).toEqual([]);
  });
});

describe("导出数据集: 不含保密字段", () => {
  const getDatabase = useVaultDatabase("export-dataset-redaction");

  it("保密字段, 隐藏自定义字段与 TOTP 被去掉, 其余内容保留", () => {
    const dataset = seedAndRead(getDatabase().orm, { includeSecrets: false });
    const login = dataset.entries[0];
    expect(dataset.includesSecrets).toBe(false);
    expect(login?.fields["password"]).toBe("");
    expect(login?.fields["account"]).toBe("alice@example.com");
    expect(login?.totp).toBeUndefined();
    expect(login?.customFields.map((field) => field.value)).toEqual([
      "答案",
      "",
    ]);
    expect(dataset.entries[6]?.fields["field-type-2"]).toBe("");
    expect(dataset.entries[6]?.fields["account"]).toBe("192.168.1.1");
  });

  it("序列化后的数据集里找不到任何保密值", () => {
    const dataset = seedAndRead(getDatabase().orm, { includeSecrets: false });
    const text = JSON.stringify(dataset.entries);
    for (const secret of [
      SAMPLE_TOTP_SECRET,
      "forum-secret",
      "6225880123456789",
      "9527",
      "router-secret",
      "key-pass",
      "wifi-secret",
      "110101199001011234",
    ]) {
      expect(text).not.toContain(secret);
    }
  });
});
