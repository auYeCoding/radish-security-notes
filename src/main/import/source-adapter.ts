import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";
import type { ImportResult } from "@shared/import/import-result";
import type {
  NotImportedItem,
  NotImportedReason,
} from "@shared/import/import-reasons";
import type { ImportSourceKey } from "@shared/import/import-source-keys";

import type { ChunkObserver } from "./import-progress";

/**
 * 适配器在来源条目里发现的, 没法带入本应用的一项内容.
 */
export interface SourceLoss {
  /**
   * 没能带入的原因代码.
   */
  readonly reason: NotImportedReason;
  /**
   * 没能带入的字段名称, 原因与具体字段无关时没有这一项.
   */
  readonly fieldName?: string;
}

/**
 * 适配器输出的中立草稿: 一个来源条目已经按来源的规则映射成本应用的类型键与字段键, 等待规划器
 * 做本应用的校验与落位. 草稿含明文字段值, 只在主进程内存里短暂停留.
 */
export interface ImportedEntryDraft {
  /**
   * 条目名称, 还没有去首尾空格与校验.
   */
  readonly name: string;
  /**
   * 本应用的预设类型键, 来源的类型在本应用没有对应类型时为 undefined.
   */
  readonly typeKey: string | undefined;
  /**
   * 类型字段取值, 键是本应用类型的字段键.
   */
  readonly fields: Readonly<Record<string, string>>;
  /**
   * 备注原文.
   */
  readonly notes: string;
  /**
   * 自定义字段, 按来源里的顺序排列.
   */
  readonly customFields: readonly NewCustomFieldInput[];
  /**
   * TOTP 输入: Base32 密钥或 otpauth 链接, 没有时为空串.
   */
  readonly totp: string;
  /**
   * 文件夹路径, 层级之间用 `/` 连接, 没有文件夹时为空串.
   */
  readonly folderPath: string;
  /**
   * 来源里的标签名, 没有标签时为空数组.
   */
  readonly tagNames: readonly string[];
  /**
   * 适配器发现的带不进的内容.
   */
  readonly losses: readonly SourceLoss[];
}

/**
 * 适配器解析来源文本的输出.
 */
export interface SourceParseOutput {
  /**
   * 解析出的条目草稿, 按来源里的顺序排列.
   */
  readonly drafts: readonly ImportedEntryDraft[];
  /**
   * 没能解析成条目的行 (例如列数不对), 它们不在草稿里.
   */
  readonly notImported: readonly NotImportedItem[];
}

/**
 * 适配器解析的结果: 草稿, 或文件级的失败.
 */
export type SourceParseResult = ImportResult<SourceParseOutput>;

/**
 * 一种来源格式的适配器. 每个适配器是独立模块, 只依赖这个接口与共享的类型, 适配器之间互不引用,
 * 新增来源只需新增适配器并登记.
 */
export interface ImportSourceAdapter {
  /**
   * 适配器处理的来源与文件格式.
   */
  readonly key: ImportSourceKey;
  /**
   * 把来源文件的文本解析成中立草稿. 文件的结构或表头与这种格式不符时返回文件级的失败结果,
   * 处理每个条目时通过观察者报告进度并让出事件循环.
   * @param text 来源文件的文本.
   * @param observer 分块观察者.
   * @returns 草稿与带不进的行, 或文件级的失败结果.
   */
  readonly parse: (
    text: string,
    observer: ChunkObserver,
  ) => Promise<SourceParseResult>;
}
