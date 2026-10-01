import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "./entry-test-environment";

/**
 * 渲染新建入口并点击它打开对话框, 等第一步的类型选择出现. 入口元素由调用方传入, 因为测试
 * 支撑代码不能引用 feature.
 * @param trigger 新建入口元素.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
export async function renderOpenedNewEntryDialog(
  trigger: React.ReactElement,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment(options);
  render(trigger, { wrapper: environment.Providers });
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "新建条目" }));
  await screen.findByRole("dialog", { name: "选择条目类型" });
  return environment;
}

/**
 * 渲染新建入口, 打开对话框并点选一个类型, 等该类型的表单出现.
 * @param trigger 新建入口元素.
 * @param typeName 要选的类型在界面上的名称, 例如 "通用登录".
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
export async function renderOpenedNewEntryForm(
  trigger: React.ReactElement,
  typeName: string,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await renderOpenedNewEntryDialog(trigger, options);
  await userEvent.setup().click(screen.getByRole("button", { name: typeName }));
  await screen.findByRole("dialog", { name: "新建条目" });
  return environment;
}

/**
 * 取对话框里全部自定义字段行, 行的无障碍名称形如 "自定义字段 1".
 * @returns 自定义字段行元素列表.
 */
export function queryCustomFieldGroups(): HTMLElement[] {
  return screen.queryAllByRole("group", { name: /^自定义字段 \d+$/ });
}
