import type { CustomEntryTypeFieldInput } from "./custom-entry-type-types";

/**
 * 编辑自定义类型时用户提交的一个字段: 在新建时的字段之上多一个字段键, 带键的是已有字段, 没有键的
 * 是新增的字段.
 */
export interface EditedCustomEntryTypeFieldInput extends CustomEntryTypeFieldInput {
  /**
   * 已有字段的字段键, 新增的字段没有这一项.
   */
  readonly key?: string;
}

/**
 * 修改一个自定义类型时用户提交的内容.
 */
export interface UpdateCustomEntryTypeInput {
  /**
   * 要修改的类型的唯一编号.
   */
  readonly id: string;
  /**
   * 修改后的类型名称.
   */
  readonly name: string;
  /**
   * 修改后的字段, 顺序就是表单与详情里的顺序, 原有字段不在其中就是被删除.
   */
  readonly fields: readonly EditedCustomEntryTypeFieldInput[];
  /**
   * 用户是否已确认这次修改的影响: 会丢失条目里的取值, 或把保密字段改成非保密.
   */
  readonly isImpactConfirmed: boolean;
}

/**
 * 删除一个自定义类型时用户提交的内容.
 */
export interface RemoveCustomEntryTypeInput {
  /**
   * 要删除的类型的唯一编号.
   */
  readonly id: string;
  /**
   * 用户是否已确认这次删除的影响: 类型下已有的条目会改归安全笔记.
   */
  readonly isImpactConfirmed: boolean;
}
