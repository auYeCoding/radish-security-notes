import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "./entry-test-environment";
import { renderInEntryEnvironment } from "./render-in-entry-environment";

/**
 * 渲染恢复入口并点开对话框. 入口元素由调用方生成, 因为测试支撑代码不能引用组件与 feature.
 * @param createTrigger 生成恢复入口元素的函数.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
export async function openRestoreDialogWith(
  createTrigger: () => React.ReactElement,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(
    createTrigger,
    options,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "从备份恢复" }));
  await screen.findByRole("dialog");
  return environment;
}

/**
 * 点对话框里的 "选择备份文件".
 * @returns 点击完成后兑现.
 */
export async function chooseBackupFile(): Promise<void> {
  await userEvent
    .setup()
    .click(await screen.findByRole("button", { name: "选择备份文件..." }));
}

/**
 * 渲染恢复入口, 点开对话框, 选择备份文件并等预览出现.
 * @param createTrigger 生成恢复入口元素的函数.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
export async function openRestorePreviewWith(
  createTrigger: () => React.ReactElement,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await openRestoreDialogWith(createTrigger, options);
  await chooseBackupFile();
  await screen.findByText("确认恢复内容");
  return environment;
}
