import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "vitest";

import { TEST_ENTRIES } from "./entry-fixtures";
import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "./entry-test-environment";
import { renderInEntryEnvironment } from "./render-in-entry-environment";

/**
 * 渲染导出入口, 读入三个测试条目并点开对话框, 等第一步的统计结束. 入口元素由调用方生成, 因为测试
 * 支撑代码不能引用组件与 feature.
 * @param createTrigger 生成导出入口元素的函数.
 * @param options 条目环境的选项, 不给条目时用三个测试条目.
 * @returns 条目环境.
 */
export async function openExportDialogWith(
  createTrigger: () => React.ReactElement,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const { environment } = await renderInEntryEnvironment(createTrigger, {
    entries: TEST_ENTRIES,
    ...options,
  });
  await act(() => environment.entryStore.getState().load());
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "导出数据" }));
  await screen.findByRole("dialog");
  await waitFor(() => expect(screen.queryByText("正在统计...")).toBeNull());
  return environment;
}

/**
 * 在第一步用默认选项点 "下一步", 勾选明文风险确认, 输入主密码并点 "导出...".
 * @returns 点击完成后兑现.
 */
export async function startPlaintextExport(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "下一步" }));
  await user.click(
    await screen.findByRole("checkbox", {
      name: "我了解导出文件是明文, 含全部密码",
    }),
  );
  await user.type(screen.getByLabelText("主密码"), "main-password");
  await user.click(screen.getByRole("button", { name: "导出..." }));
}
