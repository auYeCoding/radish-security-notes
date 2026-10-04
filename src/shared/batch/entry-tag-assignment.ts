/**
 * 一个条目在批量加标签或摘标签之后带的标签.
 */
export interface EntryTagAssignment {
  /**
   * 条目编号.
   */
  readonly entryId: string;
  /**
   * 条目现在带的标签编号, 按条目上的选择顺序排列, 没有标签时为空数组.
   */
  readonly tagIds: readonly string[];
}
