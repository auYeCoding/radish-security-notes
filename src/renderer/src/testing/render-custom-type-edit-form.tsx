import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "./entry-test-environment";
import { renderOpenedNewEntryDialog } from "./render-new-entry-dialog";

/**
 * 渲染新建入口并打开对话框, 再让条目 store 读取假桥里的条目, 这样界面能按真实应用里的方式数出
 * 每个类型下有几个条目.
 * @param trigger 新建入口元素.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
export async function renderOpenedDialogWithEntries(
  trigger: React.ReactElement,
  options: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  const environment = await renderOpenedNewEntryDialog(trigger, options);
  await act(async () => {
    await environment.entryStore.getState().load();
  });
  return environment;
}

/**
 * 在类型选择里打开一个自定义类型格的 "更多" 菜单, 选中其中的一项.
 * @param typeName 自定义类型在界面上的名称.
 * @param itemName 菜单项的名称, 例如 "编辑类型".
 */
export async function chooseTypeMenuItem(
  typeName: string,
  itemName: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: `${typeName} 的更多操作` }),
  );
  await user.click(await screen.findByRole("menuitem", { name: itemName }));
}

/**
 * 渲染新建入口, 打开对话框, 经一个自定义类型格的菜单进入编辑类型表单, 等表单出现. 入口元素由调用方
 * 传入, 因为测试支撑代码不能引用 feature.
 * @param trigger 新建入口元素.
 * @param typeName 要编辑的自定义类型在界面上的名称.
 * @param options 条目环境的选项, 里面要包含这个自定义类型.
 * @returns 渲染所用的环境.
 */
export async function renderOpenedCustomTypeEditForm(
  trigger: React.ReactElement,
  typeName: string,
  options: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  const environment = await renderOpenedDialogWithEntries(trigger, options);
  await chooseTypeMenuItem(typeName, "编辑类型");
  await screen.findByRole("dialog", { name: "编辑条目类型" });
  return environment;
}
