import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import type { VaultStatus } from "@shared/vault/vault-status";

import { VaultGate } from "./vault-gate";

/**
 * 在保险库环境里按给定状态渲染保险库门控.
 * @param status 保险库的初始状态.
 * @returns 渲染所用的环境.
 */
async function renderGate(status: VaultStatus): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({ status });
  render(<VaultGate />, { wrapper: environment.Providers });
  return environment;
}

describe("VaultGate 按状态选页", () => {
  it("needs-setup 显示引导页, 不渲染三栏主界面", async () => {
    await renderGate("needs-setup");

    expect(screen.getByRole("heading", { name: "设置主密码" })).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("locked 显示解锁页, 不渲染三栏主界面", async () => {
    await renderGate("locked");

    expect(screen.getByRole("heading", { name: "解锁" })).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("failed 显示失败页, 不渲染三栏主界面", async () => {
    await renderGate("failed");

    expect(screen.getByRole("heading", { name: "无法打开数据" })).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("unlocked 直接渲染三栏主界面", async () => {
    await renderGate("unlocked");

    expect(screen.getByRole("searchbox", { name: "搜索" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "解锁" })).toBeNull();
  });
});

describe("VaultGate 整屏页面与切换", () => {
  it("整屏页面的右上角有主题与语言切换", async () => {
    await renderGate("locked");

    expect(screen.getByRole("group", { name: "主题" })).toBeDefined();
    expect(screen.getByRole("group", { name: "语言" })).toBeDefined();
  });

  it("在解锁页点击 English 后整屏页面切换成英文", async () => {
    await renderGate("locked");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "English" }));

    expect(
      await screen.findByRole("heading", { name: "Unlock" }),
    ).toBeDefined();
  });

  it("解锁成功后切换到三栏主界面", async () => {
    await renderGate("locked");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("主密码"), "correct password");
    await user.click(screen.getByRole("button", { name: "解锁" }));

    await waitFor(() => {
      expect(screen.getByRole("searchbox", { name: "搜索" })).toBeDefined();
    });
    expect(screen.queryByRole("heading", { name: "解锁" })).toBeNull();
  });
});
