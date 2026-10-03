import { screen, within } from "@testing-library/react";

/**
 * 中间条目列表窗格的无障碍名称, 与界面语言为中文时 `entryListPane.heading` 的文案一致.
 */
const ENTRY_LIST_PANE_NAME = "条目";

/**
 * 取中间的条目列表窗格. 侧栏里的文件夹列表也是列表, 按角色整页查找会混在一起, 所以先限定在
 * 条目列表窗格里.
 * @returns 条目列表窗格元素.
 */
export function getEntryListPane(): HTMLElement {
  return screen.getByRole("region", { name: ENTRY_LIST_PANE_NAME });
}

/**
 * 取条目列表窗格里的条目列表.
 * @returns 条目列表元素.
 */
export function getEntryList(): HTMLElement {
  return within(getEntryListPane()).getByRole("list");
}

/**
 * 取条目列表窗格里的全部列表项.
 * @returns 列表项元素, 没有条目时为空数组.
 */
export function getEntryListItems(): HTMLElement[] {
  return within(getEntryListPane()).queryAllByRole("listitem");
}
