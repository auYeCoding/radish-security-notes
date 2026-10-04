import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { getEntryList } from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 在条目环境里渲染解锁后的工作区, 等条目与自定义类型读取完成.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment(options);
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.entryTypeStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 在工作区里走完 "新建类型": 打开新建对话框, 点新建类型, 填类型名称与一个字段, 保存类型.
 */
async function createSwitchType(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "新建条目" }));
  await user.click(await screen.findByRole("button", { name: "新建类型" }));
  await user.type(screen.getByLabelText("类型名称"), "交换机");
  const row = screen.getByRole("group", { name: "字段 1" });
  await user.type(within(row).getByLabelText("字段名"), "管理地址");
  await user.click(within(row).getByRole("radio"));
  await user.click(screen.getByRole("button", { name: "保存类型" }));
  await screen.findByRole("dialog", { name: "新建条目" });
}

describe("工作区里新建自定义类型并使用", () => {
  it("新建类型后直接新建条目, 列表第二行与详情都按自定义类型呈现", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await createSwitchType();
    await user.type(screen.getByLabelText("名称"), "机房交换机");
    await user.type(screen.getByLabelText("管理地址"), "10.0.0.2");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByRole("heading", { name: "机房交换机" }),
    ).toBeDefined();
    expect(
      within(getEntryList()).getByText(/交换机 · 10\.0\.0\.2/),
    ).toBeDefined();
    expect(document.querySelector("dt")?.textContent).toBe("管理地址");
  });

  it("已有的自定义类型在解锁读取后出现在新建的类型选择里", async () => {
    await renderWorkspace({ customEntryTypes: [ROUTER_TYPE] });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建条目" }));

    expect(await screen.findByRole("button", { name: "路由器" })).toBeDefined();
  });
});
