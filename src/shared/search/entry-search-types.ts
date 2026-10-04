import type { EntrySearchField } from "./search-fields";

/**
 * 一个条目参与搜索的全部文本. 只含用户选定参与搜索的字段, 保密字段, 自定义字段的值与文件夹名
 * 不在其中.
 */
export interface EntrySearchDocument {
  /**
   * 条目的唯一编号.
   */
  readonly id: string;
  /**
   * 条目名称.
   */
  readonly name: string;
  /**
   * 条目类型里参与搜索的字段取值, 键是字段键.
   */
  readonly fields: Readonly<Record<string, string>>;
  /**
   * 条目的备注.
   */
  readonly notes: string;
  /**
   * 条目的自定义字段名, 含隐藏字段的字段名.
   */
  readonly customFieldLabels: readonly string[];
  /**
   * 条目带的标签名.
   */
  readonly tagNames: readonly string[];
}

/**
 * 一个条目的搜索命中: 条目编号与命中的字段.
 */
export interface EntrySearchHit {
  /**
   * 命中的条目编号.
   */
  readonly id: string;
  /**
   * 命中的字段, 是所有关键字命中字段的并集.
   */
  readonly fields: readonly EntrySearchField[];
}

/**
 * 搜索命中表: 条目编号到命中字段的映射.
 */
export type EntrySearchMatches = ReadonlyMap<
  string,
  readonly EntrySearchField[]
>;
