import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderOpenedNewEntryDialog } from "./render-new-entry-dialog";
import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "./entry-test-environment";

/**
 * 渲染新建入口, 打开对话框并点击 "新建类型" 格, 等新建类型的表单出现. 入口元素由调用方传入, 因为
 * 测试支撑代码不能引用 feature.
 * @param trigger 新建入口元素.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
export async function renderOpenedCustomTypeForm(
  trigger: React.ReactElement,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await renderOpenedNewEntryDialog(trigger, options);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "新建类型" }));
  await screen.findByRole("dialog", { name: "新建条目类型" });
  return environment;
}

/**
 * 取新建类型表单里的一个字段行, 行的无障碍名称形如 "字段 1".
 * @param position 字段的位置, 从 1 开始.
 * @returns 字段行内的查询工具.
 */
export function withinFieldRow(position: number): ReturnType<typeof within> {
  return within(screen.getByRole("group", { name: `字段 ${position}` }));
}

/**
 * 取新建类型表单里全部字段行.
 * @returns 字段行元素列表.
 */
export function queryFieldRows(): HTMLElement[] {
  return screen.queryAllByRole("group", { name: /^字段 \d+$/ });
}
