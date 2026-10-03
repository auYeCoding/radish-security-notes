import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { EntryDetail } from "@shared/entries/entry-types";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "./entry-test-environment";

/**
 * 渲染编辑入口并点击它打开编辑对话框, 等对话框出现. 入口元素由调用方传入, 因为测试支撑代码不能
 * 引用 feature. 条目环境的列表已读取, 要编辑的条目已选中.
 * @param createTrigger 由条目详情生成编辑入口元素的函数.
 * @param detail 要编辑的条目详情, 也是假桥里的初始条目.
 * @param options 条目环境的选项, 其中的初始条目默认是要编辑的这一条.
 * @returns 渲染所用的环境.
 */
export async function renderOpenedEditEntryDialog(
  createTrigger: (detail: EntryDetail) => React.ReactElement,
  detail: EntryDetail,
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: [detail],
    ...options,
  });
  await environment.entryStore.getState().load();
  await environment.entryStore.getState().select(detail.id);
  render(createTrigger(detail), { wrapper: environment.Providers });
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "编辑条目" }));
  await screen.findByRole("dialog", { name: "编辑条目" });
  return environment;
}
