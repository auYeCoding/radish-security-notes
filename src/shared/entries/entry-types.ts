import { ACCOUNT_FIELD_KEY } from "./common-entry-fields";
import type {
  EntryCustomField,
  NewCustomFieldInput,
} from "./custom-field-types";
import type { EntryTypeKey } from "./preset-entry-types";

/**
 * 条目里类型字段的取值: 键是字段键, 值是用户填写的文本, 可以是多行, 也可以为空串.
 */
export type EntryFieldValues = Readonly<Record<string, string>>;

/**
 * 备注在复制时使用的字段名, 它不属于任何类型的字段.
 */
export const NOTES_FIELD_KEY = "notes";

/**
 * 列表里展示的条目摘要. 不含密码等字段值, 渲染端用它做列表与搜索.
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
   * 条目的类型键.
   */
  readonly type: EntryTypeKey;
  /**
   * 条目的账号, 类型没有账号字段或没有填写时为空串.
   */
  readonly account: string;
}

/**
 * 选中条目后展示的详情, 在摘要之外多类型字段, 备注与自定义字段.
 */
export interface EntryDetail extends EntrySummary {
  /**
   * 条目的类型字段取值, 类型的每个字段都有一项.
   */
  readonly fields: EntryFieldValues;
  /**
   * 条目的备注, 纯文本, 可以是多行, 也可以为空串.
   */
  readonly notes: string;
  /**
   * 条目的自定义字段, 按填写顺序排列, 没有时为空数组.
   */
  readonly customFields: readonly EntryCustomField[];
  /**
   * 条目是否带 TOTP. 密钥与验证码不在详情里, 渲染端经 TOTP 桥按需读取.
   */
  readonly hasTotp: boolean;
}

/**
 * 从类型字段取值里读出账号.
 * @param fields 条目的类型字段取值.
 * @returns 账号, 没有账号字段或没有填写时为空串.
 */
export function readAccount(fields: EntryFieldValues): string {
  return fields[ACCOUNT_FIELD_KEY] ?? "";
}

/**
 * 从条目详情取出列表里展示的摘要.
 * @param detail 条目详情.
 * @returns 条目摘要.
 */
export function toEntrySummary(detail: EntryDetail): EntrySummary {
  return {
    id: detail.id,
    name: detail.name,
    type: detail.type,
    account: readAccount(detail.fields),
  };
}

/**
 * 新建条目时用户填写的内容.
 */
export interface NewEntryInput {
  /**
   * 条目的类型键.
   */
  readonly type: EntryTypeKey;
  /**
   * 条目名称.
   */
  readonly name: string;
  /**
   * 条目的类型字段取值, 类型的每个字段都有一项.
   */
  readonly fields: EntryFieldValues;
  /**
   * 条目的备注.
   */
  readonly notes: string;
  /**
   * 条目的自定义字段, 没有时为空数组.
   */
  readonly customFields: readonly NewCustomFieldInput[];
  /**
   * TOTP 输入: Base32 密钥或 otpauth 链接, 空串表示不带 TOTP.
   */
  readonly totp: string;
}

/**
 * 编辑条目时用户填写的内容. 条目的类型保持不变, 所以不含类型.
 */
export interface UpdateEntryInput extends Omit<NewEntryInput, "type"> {
  /**
   * 是否移除条目原有的 TOTP, 为真时优先于 `totp`. `totp` 为空串且不移除时保持原来的 TOTP
   * 配置, 不为空时用新的 Base32 密钥或 otpauth 链接替换.
   */
  readonly removeTotp: boolean;
}
