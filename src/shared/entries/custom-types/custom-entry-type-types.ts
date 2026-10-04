import type { CustomFieldKind } from "./custom-field-kinds";

/**
 * 新建自定义类型时用户填写的一个字段.
 */
export interface CustomEntryTypeFieldInput {
  /**
   * 字段名.
   */
  readonly name: string;
  /**
   * 取值形态.
   */
  readonly kind: CustomFieldKind;
  /**
   * 是否保密, 保密字段默认遮掩, 不参与搜索, 不进列表摘要.
   */
  readonly isSensitive: boolean;
  /**
   * 是否是列表摘要字段, 一个类型至多一个, 且必须是非保密的单行字段.
   */
  readonly isSummary: boolean;
}

/**
 * 新建自定义类型时用户填写的内容.
 */
export interface NewCustomEntryTypeInput {
  /**
   * 类型名称.
   */
  readonly name: string;
  /**
   * 类型的字段, 顺序就是表单与详情里的顺序.
   */
  readonly fields: readonly CustomEntryTypeFieldInput[];
}

/**
 * 已保存的自定义类型的一个字段.
 */
export interface CustomEntryTypeField {
  /**
   * 字段键, 存进条目 `fields` 里的键; 列表摘要字段的键是 `account`, 其余是 `field-` 加编号.
   */
  readonly key: string;
  /**
   * 字段名.
   */
  readonly name: string;
  /**
   * 取值形态.
   */
  readonly kind: CustomFieldKind;
  /**
   * 是否保密.
   */
  readonly isSensitive: boolean;
}

/**
 * 已保存的自定义类型.
 */
export interface CustomEntryType {
  /**
   * 类型的唯一编号.
   */
  readonly id: string;
  /**
   * 类型键, 存进条目的 `type` 列.
   */
  readonly key: string;
  /**
   * 类型名称.
   */
  readonly name: string;
  /**
   * 类型的字段, 按显示顺序排列.
   */
  readonly fields: readonly CustomEntryTypeField[];
}
