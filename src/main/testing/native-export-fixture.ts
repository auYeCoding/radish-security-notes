import {
  readExportDataset,
  type ExportDatasetOptions,
} from "../export/dataset/export-dataset-reader";
import type { ExportDataset } from "../export/dataset/export-dataset";
import { nativeArchiveSerializer } from "../export/serializers/native/native-archive-serializer";
import type { ExportPayload } from "../export/serializers/export-serializer";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  SAMPLE_ATTACHMENT_CONTENTS,
  seedExportSample,
} from "./export-sample-data";
import {
  collectStream,
  createSerializeFixture,
  type SerializeFixture,
} from "./export-serializer-fixture";
import { readZipEntries, type ZipTestEntry } from "./zip-test-reader";

/**
 * 一次本应用格式序列化的结果.
 */
export interface NativeExport {
  /**
   * 压缩包里的全部文件.
   */
  readonly entries: ZipTestEntry[];
  /**
   * 序列化器的产出.
   */
  readonly payload: ExportPayload;
  /**
   * 序列化环境, 带进度与读取过的附件.
   */
  readonly fixture: SerializeFixture;
  /**
   * 序列化的数据集.
   */
  readonly dataset: ExportDataset;
}

/**
 * 默认选项: 全部范围, 含保密字段与附件.
 */
export const NATIVE_FULL_OPTIONS: ExportDatasetOptions = {
  scope: { kind: "all" },
  includeSecrets: true,
  includeAttachments: true,
};

/**
 * 解析出的 JSON, 测试里按需读取其中的属性, 类型与 `JSON.parse` 的返回值一致.
 */
export type ParsedJson = ReturnType<typeof JSON.parse>;

/**
 * 读出压缩包里指定位置的文件并解析成 JSON.
 * @param entries 压缩包里的文件.
 * @param index 文件的位置, 0 是清单, 1 是保险库数据.
 * @returns 解析出的 JSON.
 */
export function jsonAt(
  entries: readonly ZipTestEntry[],
  index: number,
): ParsedJson {
  return JSON.parse(entries[index]?.content.toString("utf8") ?? "");
}

/**
 * 写入样例, 按选项读出数据集并序列化成本应用格式的压缩包.
 * @param orm 已解锁数据库的查询入口.
 * @param options 范围与内容选项, 默认全部范围含保密字段与附件.
 * @returns 序列化的结果.
 */
export async function exportSampleAsNative(
  orm: VaultOrm,
  options: ExportDatasetOptions = NATIVE_FULL_OPTIONS,
): Promise<NativeExport> {
  seedExportSample(orm);
  const dataset = readExportDataset(orm, options);
  const fixture = createSerializeFixture(SAMPLE_ATTACHMENT_CONTENTS);
  const payload = nativeArchiveSerializer.serialize(dataset, fixture.context);
  const entries = readZipEntries(await collectStream(payload.stream));
  return { entries, payload, fixture, dataset };
}
