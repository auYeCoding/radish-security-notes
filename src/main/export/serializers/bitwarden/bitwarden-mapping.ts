import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import type { ExportEntry } from "../../dataset/export-dataset";
import type { BitwardenItemType, BitwardenTypedPart } from "./bitwarden-types";

/**
 * 映射一个条目需要的输入.
 */
export interface BitwardenMappingInput {
  /**
   * 要映射的条目.
   */
  readonly entry: ExportEntry;
  /**
   * 条目的类型定义, 类型不在目录里时为 undefined.
   */
  readonly definition: EntryTypeDefinition | undefined;
  /**
   * 取预设类型字段在当前界面语言下的名称.
   */
  readonly labelOfField: (fieldKey: string) => string;
}

/**
 * 一种类型映射的结果: Bitwarden 的条目类型与类型专属部分, 已被专属部分用掉的字段键. 没被用掉的
 * 非空类型字段由条目映射器统一写成自定义字段.
 */
export interface BitwardenTypedMapping {
  /**
   * Bitwarden 的条目类型.
   */
  readonly type: BitwardenItemType;
  /**
   * 类型专属部分.
   */
  readonly typed: BitwardenTypedPart;
  /**
   * 已被专属部分用掉的类型字段键, 不再写成自定义字段.
   */
  readonly consumedKeys: readonly string[];
  /**
   * 写进 Bitwarden 备注的文本.
   */
  readonly notes: string;
}

/**
 * 一种类型的映射函数.
 */
export type BitwardenTypedMapper = (
  input: BitwardenMappingInput,
) => BitwardenTypedMapping;

/**
 * 空串换成 null, Bitwarden 导出里没有填写的值是 null.
 * @param text 文本.
 * @returns 文本非空时是文本本身, 否则为 null.
 */
export function orNull(text: string | undefined): string | null {
  return text === undefined || text === "" ? null : text;
}

/**
 * 读条目的一个类型字段, 没有这个字段时当作空串.
 * @param entry 条目.
 * @param key 字段键.
 * @returns 字段值.
 */
export function fieldValueOf(entry: ExportEntry, key: string): string {
  return entry.fields[key] ?? "";
}
