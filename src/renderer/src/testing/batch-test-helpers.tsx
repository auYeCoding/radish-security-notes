import { act, render, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "./entry-test-environment";

/**
 * 在条目环境里读取条目, 文件夹与标签后渲染传入的界面. 界面元素由调用方传入, 因为测试支撑代码不能
 * 引用 feature.
 * @param ui 要渲染的界面元素.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
export async function renderWithLoadedStores(
  ui: ReactElement,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment(options);
  await environment.entryStore.getState().load();
  await environment.folderStore.getState().load();
  await environment.tagStore.getState().load();
  render(ui, { wrapper: environment.Providers });
  return environment;
}

/**
 * 取列表里某个条目行的勾选框.
 * @param name 条目名称.
 * @returns 勾选框元素.
 */
export function rowCheckbox(name: string): HTMLElement {
  return screen.getByRole("checkbox", { name: `选择条目 ${name}` });
}

/**
 * 取列表里某个条目行的按钮, 点它是选中查看详情.
 * @param name 条目名称.
 * @returns 条目按钮元素.
 */
export function rowButton(name: string): HTMLElement {
  return screen.getByRole("button", { name: new RegExp(name) });
}

/**
 * 逐个点击条目行的勾选框.
 * @param user 用户事件.
 * @param names 要勾选的条目名称.
 */
export async function checkRows(
  user: UserEvent,
  names: readonly string[],
): Promise<void> {
  for (const name of names) {
    await user.click(rowCheckbox(name));
  }
}

/**
 * 直接在批量选中 store 里勾选条目, 用在界面里没有条目行的测试中.
 * @param environment 条目环境.
 * @param entryIds 要勾选的条目编号.
 */
export function checkEntries(
  environment: EntryTestEnvironment,
  entryIds: readonly string[],
): void {
  act(() => {
    entryIds.forEach((id) =>
      environment.batchSelectionStore.getState().toggle(id),
    );
  });
}

/**
 * 读取批量选中里已勾选的条目编号.
 * @param environment 条目环境.
 * @returns 已勾选的条目编号, 已排序.
 */
export function checkedIdsOf(environment: EntryTestEnvironment): string[] {
  return [...environment.batchSelectionStore.getState().checkedIds].sort();
}
