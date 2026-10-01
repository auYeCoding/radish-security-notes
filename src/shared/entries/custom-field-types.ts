/**
 * 条目里已保存的一个自定义字段.
 */
export interface EntryCustomField {
  /**
   * 字段的唯一编号, 由主进程在新建条目时分配.
   */
  readonly id: string;
  /**
   * 字段名.
   */
  readonly label: string;
  /**
   * 字段值, 可以是多行文本, 也可以为空串.
   */
  readonly value: string;
  /**
   * 是否是隐藏字段, 隐藏字段在详情里默认遮罩显示.
   */
  readonly isHidden: boolean;
}

/**
 * 新建条目时用户填写的一个自定义字段, 编号由主进程分配.
 */
export type NewCustomFieldInput = Omit<EntryCustomField, "id">;
