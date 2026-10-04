/**
 * 列表里隐藏的 "选择条目" 提示文字的元素编号. 每一行的勾选框用 `aria-labelledby` 指向它与条目名称,
 * 无障碍名称是 "选择条目 条目名称". 显式给出 `aria-labelledby` 还有一个性能上的原因: 不给时, Base UI
 * 复选框每次渲染都要读输入框的 `labels` 去找关联的标签, 浏览器每次都得扫描整份文档, 条目很多时
 * 全选会慢到数秒.
 */
export const ROW_CHECKBOX_PROMPT_ID = "entry-row-checkbox-prompt";

/**
 * 取一个条目在列表里名称文字的元素编号.
 * @param entryId 条目编号.
 * @returns 元素编号.
 */
export function entryNameElementId(entryId: string): string {
  return `entry-name-${entryId}`;
}

/**
 * 取一个条目的勾选框指向的 `aria-labelledby`: 先是共用的提示, 再是条目名称.
 * @param entryId 条目编号.
 * @returns `aria-labelledby` 的取值.
 */
export function rowCheckboxLabelledBy(entryId: string): string {
  return `${ROW_CHECKBOX_PROMPT_ID} ${entryNameElementId(entryId)}`;
}
