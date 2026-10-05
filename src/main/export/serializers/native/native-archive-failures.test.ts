import { describe, expect, it } from "vitest";

import {
  SAMPLE_ATTACHMENT_CONTENTS,
  seedExportSample,
} from "../../../testing/export-sample-data";
import {
  collectStream,
  createSerializeFixture,
} from "../../../testing/export-serializer-fixture";
import { NATIVE_FULL_OPTIONS } from "../../../testing/native-export-fixture";
import { readZipEntries } from "../../../testing/zip-test-reader";
import { useVaultDatabase } from "../../../testing/use-vault-database";
import { readExportDataset } from "../../dataset/export-dataset-reader";
import {
  ExportAttachmentMissingError,
  ExportCancelledError,
} from "../../export-errors";
import { nativeArchiveSerializer } from "./native-archive-serializer";

describe("本应用格式: 空保险库", () => {
  const getDatabase = useVaultDatabase("export-native-empty");

  it("得到条目为空的合法压缩包", async () => {
    const dataset = readExportDataset(getDatabase().orm, NATIVE_FULL_OPTIONS);
    const payload = nativeArchiveSerializer.serialize(
      dataset,
      createSerializeFixture().context,
    );
    const entries = readZipEntries(await collectStream(payload.stream));
    const vault = JSON.parse(entries[1]?.content.toString("utf8") ?? "");
    expect(vault).toEqual({
      folders: [],
      tags: [],
      customEntryTypes: [],
      entries: [],
    });
  });
});

describe("本应用格式: 失败与取消", () => {
  const getDatabase = useVaultDatabase("export-native-failures");

  it("导出途中附件内容已读不到时整个流出错, 错误不含附件名称", async () => {
    seedExportSample(getDatabase().orm);
    const dataset = readExportDataset(getDatabase().orm, NATIVE_FULL_OPTIONS);
    const contents = new Map(SAMPLE_ATTACHMENT_CONTENTS);
    contents.delete("att-2");
    const payload = nativeArchiveSerializer.serialize(
      dataset,
      createSerializeFixture(contents).context,
    );
    const error = await collectStream(payload.stream).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(ExportAttachmentMissingError);
    expect((error as Error).message).not.toContain("data.bin");
  });

  it("用户取消后流以取消错误结束", async () => {
    seedExportSample(getDatabase().orm);
    const dataset = readExportDataset(getDatabase().orm, NATIVE_FULL_OPTIONS);
    const fixture = createSerializeFixture(SAMPLE_ATTACHMENT_CONTENTS);
    fixture.cancel();
    const payload = nativeArchiveSerializer.serialize(dataset, fixture.context);
    const error = await collectStream(payload.stream).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(ExportCancelledError);
  });
});

describe("本应用格式: 内存", () => {
  const getDatabase = useVaultDatabase("export-native-memory");

  it("附件按需逐个读出: 消费者不读时不会把全部附件读进内存", async () => {
    seedExportSample(getDatabase().orm);
    const dataset = readExportDataset(getDatabase().orm, NATIVE_FULL_OPTIONS);
    const big = new Map(
      Array.from(SAMPLE_ATTACHMENT_CONTENTS.keys(), (id) => [
        id,
        Buffer.alloc(1024 * 1024, 7),
      ]),
    );
    const fixture = createSerializeFixture(big);
    const payload = nativeArchiveSerializer.serialize(dataset, fixture.context);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(fixture.readAttachmentIds.length).toBeLessThan(3);
    payload.stream.destroy();
  });
});
