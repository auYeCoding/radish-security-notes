import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 在条目环境里渲染解锁后的工作区, 等条目读取完成.
 * @param entries 假桥里的初始条目.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(
  entries = TEST_ENTRIES,
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({ entries });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

describe("解锁后的工作区", () => {
  it("挂载时读取条目并列出, 搜索框已聚焦", async () => {
    await renderWorkspace();

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(document.activeElement).toBe(
      screen.getByRole("searchbox", { name: "搜索" }),
    );
  });

  it("输入关键字, 选中, 复制三次操作内复制到密码", async () => {
    const { entryBridge } = await renderWorkspace();
    const user = userEvent.setup();

    await user.keyboard("bank");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /银行/ }));
    await user.click(await screen.findByRole("button", { name: "复制密码" }));

    expect(entryBridge.copyField).toHaveBeenCalledTimes(1);
    expect(entryBridge.copyField).toHaveBeenCalledWith("bank", "password");
    expect(screen.getByRole("button", { name: "复制密码" }).textContent).toBe(
      "已复制",
    );
  });

  it("清空关键字后恢复全部条目", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.keyboard("bank");

    await user.clear(screen.getByRole("searchbox", { name: "搜索" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("工作区新建条目", () => {
  it("在对话框保存后, 列表最前出现新条目, 右侧详情展示它", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建条目" }));
    await user.type(await screen.findByLabelText("名称"), "新条目");
    await user.type(screen.getByLabelText("账号"), "new-account");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getAllByRole("listitem")[0]?.textContent).toContain("新条目");
    expect(screen.getByRole("heading", { name: "新条目" })).toBeDefined();
  });

  it("搜索中新建条目后清空关键字, 新条目出现在列表里", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.keyboard("bank");

    await user.click(screen.getByRole("button", { name: "新建条目" }));
    await user.type(await screen.findByLabelText("名称"), "全新");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
});
