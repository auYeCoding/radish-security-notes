import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "vitest";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "./entry-test-environment";
import { renderInEntryEnvironment } from "./render-in-entry-environment";

/**
 * 渲染邮箱备份入口并点开对话框, 等设置读取完成. 入口元素由调用方生成, 因为测试支撑代码不能引用
 * 组件与 feature.
 * @param createTrigger 生成邮箱备份入口元素的函数.
 * @param options 条目环境的选项.
 * @returns 条目环境.
 */
export async function openEmailBackupDialogWith(
  createTrigger: () => React.ReactElement,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(
    createTrigger,
    options,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "邮箱备份" }));
  await screen.findByRole("dialog");
  await waitFor(() => expect(screen.queryByText("正在读取设置...")).toBeNull());
  return environment;
}

/**
 * 在还没保存过设置的对话框里填好一个可以保存的新账号: 邮箱地址, 授权码, 加密口令与确认口令.
 * @returns 填写完成后兑现.
 */
export async function fillNewAccount(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("邮箱地址"), "alice@qq.com");
  await user.type(
    screen.getByLabelText("授权码或应用专用密码"),
    "abcdefghijklmnop",
  );
  await user.type(
    screen.getByLabelText("备份口令"),
    "a long enough passphrase",
  );
  await user.type(
    screen.getByLabelText("确认口令"),
    "a long enough passphrase",
  );
}

/**
 * 按名称取对话框里的按钮是否不可点.
 * @param name 按钮的名称.
 * @returns 不可点时为 true.
 */
export function isButtonDisabled(name: string): boolean {
  return screen.getByRole("button", { name }).hasAttribute("disabled");
}
