/**
 * 列表里展示的条目摘要. 不含密码, 渲染端用它做列表与搜索.
 */
export interface EntrySummary {
  /**
   * 条目的唯一编号.
   */
  readonly id: string;
  /**
   * 条目名称.
   */
  readonly name: string;
  /**
   * 条目的账号, 可以为空串.
   */
  readonly account: string;
}

/**
 * 选中条目后展示的详情, 在摘要之外多一个密码.
 */
export interface EntryDetail extends EntrySummary {
  /**
   * 条目的密码, 可以为空串.
   */
  readonly password: string;
}

/**
 * 从条目详情取出列表里展示的摘要.
 * @param detail 条目详情.
 * @returns 条目摘要.
 */
export function toEntrySummary(detail: EntryDetail): EntrySummary {
  return { id: detail.id, name: detail.name, account: detail.account };
}

/**
 * 新建条目时用户填写的内容.
 */
export interface NewEntryInput {
  /**
   * 条目名称.
   */
  readonly name: string;
  /**
   * 条目的账号.
   */
  readonly account: string;
  /**
   * 条目的密码.
   */
  readonly password: string;
}

/**
 * 可以复制到剪贴板的条目字段.
 */
export const ENTRY_COPY_FIELDS = ["account", "password"] as const;

/**
 * 可以复制到剪贴板的条目字段名.
 */
export type EntryCopyField = (typeof ENTRY_COPY_FIELDS)[number];

/**
 * 判断一个值是否是可复制的条目字段名.
 * @param value 待判断的值.
 * @returns 是可复制字段名时返回 true.
 */
export function isEntryCopyField(value: unknown): value is EntryCopyField {
  return ENTRY_COPY_FIELDS.some((field) => field === value);
}
