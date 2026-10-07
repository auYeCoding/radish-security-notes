import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "./entry-test-environment";
import { renderInEntryEnvironment } from "./render-in-entry-environment";

/**
 * 渲染设置入口并点开设置对话框. 入口元素由调用方生成, 因为测试支撑代码不能引用组件与 feature.
 * @param createEntry 生成设置入口元素的函数.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
export async function openSettingsDialogWith(
  createEntry: () => React.ReactElement,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(createEntry, options);
  await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));
  await screen.findByRole("dialog", { name: "设置" });
  return environment;
}

/**
 * 按标题判断某个对话框是否仍在文档里, 不论它是否被上层对话框遮住. 被遮住的对话框带 aria-hidden,
 * 算不出对话框自己的名称, 所以按它的标题查找.
 * @param title 对话框的标题.
 * @returns 仍在文档里时为 true.
 */
export function isDialogMounted(title: string): boolean {
  return (
    screen.queryByRole("heading", { name: title, level: 2, hidden: true }) !==
    null
  );
}
