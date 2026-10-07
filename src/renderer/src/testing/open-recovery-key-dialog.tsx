import { screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "./entry-test-environment";
import { renderInEntryEnvironment } from "./render-in-entry-environment";

/**
 * 查看恢复密钥验证对话框的无障碍名称.
 */
const VERIFY_DIALOG_NAME = "查看恢复密钥";

/**
 * 渲染查看恢复密钥的入口并点开验证对话框. 入口元素由调用方生成, 因为测试支撑代码不能引用组件
 * 与 feature.
 * @param createViewer 生成入口元素的函数.
 * @param options 条目环境的选项, 例如是否设了主密码, 覆盖假恢复桥的查看方法.
 * @param user 点击所用的用户事件, 默认新建一个.
 * @returns 条目环境.
 */
export async function openRecoveryKeyVerifyWith(
  createViewer: () => React.ReactElement,
  options: EntryTestEnvironmentOptions = {},
  user: UserEvent = userEvent.setup(),
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(createViewer, options);
  await user.click(screen.getByRole("button", { name: VERIFY_DIALOG_NAME }));
  await screen.findByRole("dialog", { name: VERIFY_DIALOG_NAME });
  return environment;
}

/**
 * 在验证对话框里提交验证: 给出主密码时先输入, 没给出时勾选 "周围没有他人查看", 然后点 "查看".
 * 调用前主密码状态必须已读到, 否则找不到对应的字段.
 * @param user 点击与输入所用的用户事件.
 * @param password 当前主密码, 由系统保护时不给.
 * @returns 提交之后兑现.
 */
export async function submitRecoveryKeyVerification(
  user: UserEvent,
  password?: string,
): Promise<void> {
  if (password === undefined) {
    await user.click(
      await screen.findByRole("checkbox", {
        name: "我已确认周围没有他人查看",
      }),
    );
  } else {
    await user.type(await screen.findByLabelText("当前主密码"), password);
  }
  await user.click(screen.getByRole("button", { name: "查看" }));
}
