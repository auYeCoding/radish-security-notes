import { bitwardenJsonSerializer } from "../export/serializers/bitwarden/bitwarden-json-serializer";
import {
  readExportDataset,
  type ExportDatasetOptions,
} from "../export/dataset/export-dataset-reader";
import type { ExportPayload } from "../export/serializers/export-serializer";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { seedExportSample } from "./export-sample-data";
import {
  collectStream,
  createSerializeFixture,
  type SerializeFixture,
} from "./export-serializer-fixture";

/**
 * 导出的 Bitwarden JSON 里的一个自定义字段.
 */
export interface LooseField {
  /**
   * 字段名.
   */
  readonly name: string;
  /**
   * 字段值.
   */
  readonly value: string;
  /**
   * 字段类型, 0 文本, 1 隐藏.
   */
  readonly type: number;
}

/**
 * 导出的 Bitwarden JSON 里的一个条目, 测试里只按需读取其中的属性.
 */
export interface LooseItem {
  /**
   * 条目编号.
   */
  readonly id: string;
  /**
   * Bitwarden 条目类型.
   */
  readonly type: number;
  /**
   * 条目名称.
   */
  readonly name: string;
  /**
   * 备注.
   */
  readonly notes: string | null;
  /**
   * 所属文件夹的编号.
   */
  readonly folderId: string | null;
  /**
   * 自定义字段.
   */
  readonly fields?: LooseField[];
  /**
   * 登录部分.
   */
  readonly login?: Record<string, unknown>;
  /**
   * 卡部分.
   */
  readonly card?: Record<string, unknown>;
  /**
   * 身份部分.
   */
  readonly identity?: Record<string, unknown>;
  /**
   * SSH 密钥部分.
   */
  readonly sshKey?: Record<string, unknown>;
  /**
   * 安全笔记部分.
   */
  readonly secureNote?: Record<string, unknown>;
}

/**
 * 导出的 Bitwarden JSON 里的一个文件夹.
 */
export interface LooseFolder {
  /**
   * 文件夹编号.
   */
  readonly id: string;
  /**
   * 文件夹名称.
   */
  readonly name: string;
}

/**
 * 导出的 Bitwarden JSON 文档.
 */
export interface LooseDocument {
  /**
   * 是否加密.
   */
  readonly encrypted: boolean;
  /**
   * 文件夹.
   */
  readonly folders: LooseFolder[];
  /**
   * 条目.
   */
  readonly items: LooseItem[];
}

/**
 * 一次 Bitwarden JSON 序列化的结果.
 */
export interface BitwardenExport {
  /**
   * 输出的文本.
   */
  readonly text: string;
  /**
   * 解析后的文档.
   */
  readonly document: LooseDocument;
  /**
   * 序列化器的产出, 带计数与带不出内容的汇总.
   */
  readonly payload: ExportPayload;
  /**
   * 序列化环境, 带进度.
   */
  readonly fixture: SerializeFixture;
}

/**
 * 默认选项: 全部范围, 含保密字段与附件.
 */
export const FULL_EXPORT_OPTIONS: ExportDatasetOptions = {
  scope: { kind: "all" },
  includeSecrets: true,
  includeAttachments: true,
};

/**
 * 按选项读出库里已有的数据并序列化成 Bitwarden JSON.
 * @param orm 已解锁数据库的查询入口.
 * @param options 范围与内容选项, 默认全部范围含保密字段.
 * @returns 序列化的结果.
 */
export async function exportSeededAsBitwarden(
  orm: VaultOrm,
  options: ExportDatasetOptions = FULL_EXPORT_OPTIONS,
): Promise<BitwardenExport> {
  const dataset = readExportDataset(orm, options);
  const fixture = createSerializeFixture();
  const payload = bitwardenJsonSerializer.serialize(dataset, fixture.context);
  const text = (await collectStream(payload.stream)).toString("utf8");
  return { text, document: JSON.parse(text), payload, fixture };
}

/**
 * 写入样例, 按选项读出数据集并序列化成 Bitwarden JSON.
 * @param orm 已解锁数据库的查询入口.
 * @param options 范围与内容选项, 默认全部范围含保密字段.
 * @returns 序列化的结果.
 */
export async function exportSampleAsBitwarden(
  orm: VaultOrm,
  options: ExportDatasetOptions = FULL_EXPORT_OPTIONS,
): Promise<BitwardenExport> {
  seedExportSample(orm);
  return exportSeededAsBitwarden(orm, options);
}
