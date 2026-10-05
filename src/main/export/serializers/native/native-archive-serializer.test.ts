import { describe, expect, it } from "vitest";

import {
  SAMPLE_BINARY_BYTES,
  SAMPLE_ENTRY_IDS,
  SAMPLE_LOGIN_PASSWORD,
  SAMPLE_PDF_BYTES,
  SAMPLE_TOTP_SECRET,
} from "../../../testing/export-sample-data";
import { SAMPLE_CREATED_AT } from "../../../testing/export-serializer-fixture";
import {
  exportSampleAsNative,
  jsonAt,
  NATIVE_FULL_OPTIONS,
} from "../../../testing/native-export-fixture";
import { useVaultDatabase } from "../../../testing/use-vault-database";
import { nativeArchiveSerializer } from "./native-archive-serializer";

/**
 * 保险库数据里第一个条目 (示例登录) 应有的完整内容.
 */
const FIRST_ENTRY_DOCUMENT = {
  id: SAMPLE_ENTRY_IDS.login,
  type: "login",
  name: "示例登录, 含逗号",
  fields: {
    account: "alice@example.com",
    password: SAMPLE_LOGIN_PASSWORD,
    url: "https://example.com/login",
  },
  notes: "备注, 含逗号\n第二行",
  notesFormat: "plain",
  customFields: [
    { id: "cf-1", label: "密保问题", value: "答案", isHidden: false },
    { id: "cf-2", label: "PIN", value: "9527", isHidden: true },
  ],
  totp: {
    secret: SAMPLE_TOTP_SECRET,
    algorithm: "SHA1",
    digits: 6,
    periodSeconds: 30,
  },
  folderId: "folder-work",
  tagIds: ["tag-key", "tag-daily"],
  createdAt: 1000,
  attachments: [
    {
      id: "att-1",
      name: "报告 final.pdf",
      size: SAMPLE_PDF_BYTES.length,
      position: 0,
      path: "attachments/att-1",
    },
    {
      id: "att-2",
      name: "data.bin",
      size: 256,
      position: 1,
      path: "attachments/att-2",
    },
  ],
};

/**
 * 带字段键的字段, 测试里用来取自定义类型的字段键.
 */
interface KeyedField {
  /**
   * 字段键.
   */
  readonly key: string;
}

describe("本应用格式: 压缩包结构", () => {
  const getDatabase = useVaultDatabase("export-native-structure");

  it("文件顺序固定: 清单, 保险库数据, 然后每个附件", async () => {
    const { entries } = await exportSampleAsNative(getDatabase().orm);
    expect(entries.map((entry) => entry.name)).toEqual([
      "manifest.json",
      "vault.json",
      "attachments/att-1",
      "attachments/att-2",
      "attachments/att-3",
    ]);
  });

  it("清单记录格式, 版本, 范围, 含保密字段与附件的标志与计数", async () => {
    const { entries } = await exportSampleAsNative(getDatabase().orm);
    expect(jsonAt(entries, 0)).toEqual({
      format: "radish-security-notes-export",
      version: 1,
      createdAt: SAMPLE_CREATED_AT.toISOString(),
      scope: "all",
      includesSecrets: true,
      includesAttachments: true,
      counts: {
        entries: 8,
        folders: 3,
        tags: 3,
        customEntryTypes: 2,
        attachments: 3,
      },
    });
  });
});

describe("本应用格式: 保险库数据里的条目", () => {
  const getDatabase = useVaultDatabase("export-native-entries");

  it("第一个条目与库里逐项一致", async () => {
    const { entries } = await exportSampleAsNative(getDatabase().orm);
    const vault = jsonAt(entries, 1);
    expect(vault.entries).toHaveLength(8);
    expect(vault.entries[0]).toEqual(FIRST_ENTRY_DOCUMENT);
  });

  it("其余条目的格式, TOTP 参数, 文件夹与类型键", async () => {
    const { entries } = await exportSampleAsNative(getDatabase().orm);
    const vault = jsonAt(entries, 1);
    expect(vault.entries[1].notesFormat).toBe("markdown");
    expect(vault.entries[1].totp.algorithm).toBe("SHA256");
    expect(vault.entries[2].folderId).toBe("folder-home");
    expect(vault.entries[3].totp).toBeNull();
    expect(vault.entries[3].folderId).toBeNull();
    expect(vault.entries[6].type).toBe("custom:type-1");
  });
});

describe("本应用格式: 文件夹, 标签, 类型与附件内容", () => {
  const getDatabase = useVaultDatabase("export-native-labels");

  it("文件夹与标签的数组顺序是创建顺序", async () => {
    const { entries } = await exportSampleAsNative(getDatabase().orm);
    const vault = jsonAt(entries, 1);
    expect(vault.folders).toEqual([
      { id: "folder-work", name: "工作" },
      { id: "folder-home", name: "Home" },
      { id: "folder-unused", name: "没人用" },
    ]);
    expect(vault.tags[0]).toEqual({
      id: "tag-key",
      name: "重要",
      color: "red",
    });
  });

  it("自定义类型定义完整, 附件内容逐字节与库里一致", async () => {
    const { entries } = await exportSampleAsNative(getDatabase().orm);
    const type = jsonAt(entries, 1).customEntryTypes[0];
    expect(type).toMatchObject({ id: "type-1", key: "custom:type-1" });
    expect(type.fields.map((field: KeyedField) => field.key)).toEqual([
      "account",
      "field-type-2",
      "field-type-3",
    ]);
    expect(entries[2]?.content.equals(SAMPLE_PDF_BYTES)).toBe(true);
    expect(entries[3]?.content.equals(SAMPLE_BINARY_BYTES)).toBe(true);
    expect(entries[4]?.content.toString("utf8")).toBe("cfg");
    expect([entries[0]?.method, entries[2]?.method]).toEqual([8, 0]);
  });
});

describe("本应用格式: 计数与进度", () => {
  const getDatabase = useVaultDatabase("export-native-counts");

  it("摘要计数与总步数一致, 进度步数之和等于总步数", async () => {
    const { payload, fixture, dataset } = await exportSampleAsNative(
      getDatabase().orm,
    );
    expect(payload).toMatchObject({
      entryCount: 8,
      attachmentCount: 3,
      losses: [],
    });
    expect(nativeArchiveSerializer.countSteps(dataset)).toBe(11);
    expect(fixture.progress.total).toBe(11);
  });

  it("全部范围的默认选项含保密字段与附件", () => {
    expect(NATIVE_FULL_OPTIONS).toMatchObject({
      includeSecrets: true,
      includeAttachments: true,
    });
  });
});
