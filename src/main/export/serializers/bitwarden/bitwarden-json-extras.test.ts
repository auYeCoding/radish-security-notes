import { describe, expect, it } from "vitest";

import { bitwardenJsonAdapter } from "../../../import/adapters/bitwarden-json-adapter";
import {
  exportSampleAsBitwarden,
  FULL_EXPORT_OPTIONS,
} from "../../../testing/bitwarden-export-fixture";
import {
  SAMPLE_LOGIN_PASSWORD,
  SAMPLE_TOTP_SECRET,
  seedExportSample,
} from "../../../testing/export-sample-data";
import {
  collectStream,
  createSerializeFixture,
} from "../../../testing/export-serializer-fixture";
import { parseOutput } from "../../../testing/import-draft-fixture";
import { useVaultDatabase } from "../../../testing/use-vault-database";
import { readExportDataset } from "../../dataset/export-dataset-reader";
import { bitwardenJsonSerializer } from "./bitwarden-json-serializer";

describe("Bitwarden JSON: 带不出的内容与进度", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-losses");

  it("汇总只列个数大于 0 的原因", async () => {
    const { payload } = await exportSampleAsBitwarden(getDatabase().orm);
    expect(payload.losses).toEqual([
      { reason: "tags", count: 2 },
      { reason: "attachments", count: 3 },
      { reason: "customEntryTypes", count: 2 },
      { reason: "mergedTypes", count: 3 },
      { reason: "markdownNotes", count: 1 },
    ]);
    expect(payload).toMatchObject({ entryCount: 8, attachmentCount: 0 });
  });

  it("每个条目一步进度, 总步数等于条目数", async () => {
    const { fixture } = await exportSampleAsBitwarden(getDatabase().orm);
    expect(fixture.progress.total).toBe(8);
  });
});

describe("Bitwarden JSON: 不含保密字段", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-redaction");

  it("输出里找不到任何保密值", async () => {
    const { text } = await exportSampleAsBitwarden(getDatabase().orm, {
      ...FULL_EXPORT_OPTIONS,
      includeSecrets: false,
    });
    for (const secret of [
      SAMPLE_TOTP_SECRET,
      SAMPLE_LOGIN_PASSWORD,
      "forum-secret",
      "6225880123456789",
      "9527",
      "4321",
      "router-secret",
      "key-pass",
      "wifi-secret",
      "110101199001011234",
    ]) {
      expect(text).not.toContain(secret);
    }
  });
});

describe("Bitwarden JSON: 类型不在目录里的条目", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-orphan");

  it("按登录输出, 类型字段按字段键写成隐藏字段", async () => {
    seedExportSample(getDatabase().orm);
    const dataset = readExportDataset(getDatabase().orm, FULL_EXPORT_OPTIONS);
    const orphan = {
      ...dataset.entries[0]!,
      typeKey: "custom:gone",
      fields: { account: "a", secret: "s", empty: "" },
      customFields: [],
      totp: undefined,
    };
    const payload = bitwardenJsonSerializer.serialize(
      { ...dataset, entries: [orphan] },
      createSerializeFixture().context,
    );
    const bytes = await collectStream(payload.stream);
    const item = JSON.parse(bytes.toString("utf8")).items[0];
    expect(item.type).toBe(1);
    expect(item.login.username).toBe("a");
    expect(item.fields).toEqual([
      { name: "secret", value: "s", type: 1, linkedId: null },
    ]);
  });
});

describe("Bitwarden JSON: 与导入适配器互为逆向", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-roundtrip");

  it("导出的文件能被 0034 的适配器读回, 类型与文件夹对得上", async () => {
    const { text } = await exportSampleAsBitwarden(getDatabase().orm);
    const output = await parseOutput(bitwardenJsonAdapter, text);
    expect(output.notImported).toEqual([]);
    expect(output.drafts.map((draft) => draft.typeKey)).toEqual([
      "login",
      "login",
      "bankCard",
      "identity",
      "secureNote",
      "sshKey",
      "login",
      "login",
    ]);
    expect(output.drafts[0]).toMatchObject({
      name: "示例登录, 含逗号",
      folderPath: "工作",
      totp: SAMPLE_TOTP_SECRET,
    });
  });

  it("读回的登录条目字段与自定义字段与库里一致", async () => {
    const { text } = await exportSampleAsBitwarden(getDatabase().orm);
    const login = (await parseOutput(bitwardenJsonAdapter, text)).drafts[0];
    expect(login?.fields).toMatchObject({
      account: "alice@example.com",
      password: SAMPLE_LOGIN_PASSWORD,
      url: "https://example.com/login",
    });
    expect(login?.customFields).toEqual([
      { label: "密保问题", value: "答案", isHidden: false },
      { label: "PIN", value: "9527", isHidden: true },
    ]);
  });
});
