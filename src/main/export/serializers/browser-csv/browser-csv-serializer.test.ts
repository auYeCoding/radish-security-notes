import { describe, expect, it } from "vitest";

import type { VaultOrm } from "../../../vault/database/drizzle-adapter";
import {
  SAMPLE_LOGIN_PASSWORD,
  seedExportSample,
} from "../../../testing/export-sample-data";
import {
  collectStream,
  createSerializeFixture,
  type SerializeFixture,
} from "../../../testing/export-serializer-fixture";
import { useVaultDatabase } from "../../../testing/use-vault-database";
import {
  readExportDataset,
  type ExportDatasetOptions,
} from "../../dataset/export-dataset-reader";
import { ExportCancelledError } from "../../export-errors";
import type { ExportPayload } from "../export-serializer";
import { browserCsvSerializer } from "./browser-csv-serializer";

/**
 * 一次浏览器密码 CSV 序列化的结果.
 */
interface CsvExport {
  /**
   * 输出的字节.
   */
  readonly bytes: Buffer;
  /**
   * 输出的文本.
   */
  readonly text: string;
  /**
   * 序列化器的产出.
   */
  readonly payload: ExportPayload;
  /**
   * 序列化环境.
   */
  readonly fixture: SerializeFixture;
}

/**
 * 默认选项: 全部范围, 含保密字段与附件.
 */
const FULL_OPTIONS: ExportDatasetOptions = {
  scope: { kind: "all" },
  includeSecrets: true,
  includeAttachments: true,
};

/**
 * 写入样例并序列化成浏览器密码 CSV.
 * @param orm 已解锁数据库的查询入口.
 * @param options 范围与内容选项.
 * @returns 序列化的结果.
 */
async function exportSampleAsCsv(
  orm: VaultOrm,
  options: ExportDatasetOptions = FULL_OPTIONS,
): Promise<CsvExport> {
  seedExportSample(orm);
  const dataset = readExportDataset(orm, options);
  const fixture = createSerializeFixture();
  const payload = browserCsvSerializer.serialize(dataset, fixture.context);
  const bytes = await collectStream(payload.stream);
  return { bytes, text: bytes.toString("utf8"), payload, fixture };
}

describe("浏览器密码 CSV: 内容", () => {
  const getDatabase = useVaultDatabase("export-browser-csv-content");

  it("表头是 Chrome 的五列, 行以 CRLF 结束, 只写有密码字段的条目, 无 BOM", async () => {
    const { bytes, text } = await exportSampleAsCsv(getDatabase().orm);
    const password = SAMPLE_LOGIN_PASSWORD.replaceAll('"', '""');
    expect(bytes[0]).not.toBe(0xef);
    expect(text).toBe(
      [
        "name,url,username,password,note",
        `"示例登录, 含逗号",https://example.com/login,alice@example.com,"${password}","备注, 含逗号\n第二行"`,
        '论坛,https://forum.example.org,bob,forum-secret,"# 标题\n\n- 一\n- 二"',
        "",
      ].join("\r\n"),
    );
  });

  it("含逗号, 引号, 换行的字段按 CSV 规则加引号", async () => {
    const { text } = await exportSampleAsCsv(getDatabase().orm);
    expect(text).toContain('"p@ss,""word""\nsecond-line"');
    expect(text.split("\r\n")).toHaveLength(4);
  });
});

describe("浏览器密码 CSV: 带不出的内容与进度", () => {
  const getDatabase = useVaultDatabase("export-browser-csv-losses");

  it("汇总列出带不出的内容", async () => {
    const { payload } = await exportSampleAsCsv(getDatabase().orm);
    expect(payload.losses).toEqual([
      { reason: "unsupportedEntries", count: 6 },
      { reason: "totp", count: 2 },
      { reason: "customFields", count: 1 },
      { reason: "extraFields", count: 1 },
      { reason: "folders", count: 1 },
      { reason: "tags", count: 1 },
      { reason: "attachments", count: 3 },
      { reason: "markdownNotes", count: 1 },
    ]);
    expect(payload).toMatchObject({ entryCount: 2, attachmentCount: 0 });
  });

  it("跳过的条目也算一步进度, 总步数等于条目数", async () => {
    const { fixture } = await exportSampleAsCsv(getDatabase().orm);
    expect(fixture.progress.total).toBe(8);
  });
});

describe("浏览器密码 CSV: 取消, 脱敏与空保险库", () => {
  const getDatabase = useVaultDatabase("export-browser-csv-edge");

  it("用户取消后流以取消错误结束", async () => {
    seedExportSample(getDatabase().orm);
    const dataset = readExportDataset(getDatabase().orm, FULL_OPTIONS);
    const fixture = createSerializeFixture();
    fixture.cancel();
    const payload = browserCsvSerializer.serialize(dataset, fixture.context);
    const error = await collectStream(payload.stream).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(ExportCancelledError);
  });

  it("不含保密字段时密码列为空, 密码值不在输出里", async () => {
    const { text } = await exportSampleAsCsv(getDatabase().orm, {
      ...FULL_OPTIONS,
      includeSecrets: false,
    });
    expect(text).not.toContain("forum-secret");
    expect(text).toContain("论坛,https://forum.example.org,bob,,");
  });

  it("没有任何条目时只有表头", async () => {
    const dataset = readExportDataset(getDatabase().orm, FULL_OPTIONS);
    const payload = browserCsvSerializer.serialize(
      dataset,
      createSerializeFixture().context,
    );
    const text = (await collectStream(payload.stream)).toString("utf8");
    expect(text).toBe("name,url,username,password,note\r\n");
  });
});
