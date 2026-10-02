import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FORUM_ENTRY, MAIL_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { failingWith } from "@renderer/testing/fake-totp-bridge";

import { EntryDetailPane } from "./entry-detail-pane";

/**
 * 假 TOTP 桥读出的密钥.
 */
const SECRET = "JBSWY3DPEHPK3PXP";

/**
 * 选中带 TOTP 的邮箱条目并渲染详情窗格.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderPane(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: [MAIL_ENTRY, FORUM_ENTRY],
    ...options,
  });
  await environment.entryStore.getState().select(MAIL_ENTRY.id);
  render(<EntryDetailPane />, { wrapper: environment.Providers });
  await screen.findByRole("heading", { name: "邮箱" });
  return environment;
}

describe("详情的 TOTP 密钥行 默认遮罩", () => {
  it("默认遮罩, 不向主进程取密钥, 页面上没有密钥文本", async () => {
    const { totpBridge } = await renderPane();

    expect(totpBridge.revealSecret).not.toHaveBeenCalled();
    expect(screen.getByText("TOTP 密钥 已隐藏")).toBeDefined();
    expect(document.body.textContent).not.toContain(SECRET);
    expect(
      screen.getByRole("button", { name: "显示 TOTP 密钥" }),
    ).toBeDefined();
  });

  it("点击复制直接让主进程复制密钥, 不必先显示, 页面上仍没有密钥文本", async () => {
    const { totpBridge } = await renderPane();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "复制 TOTP 密钥" }));

    expect(totpBridge.copySecret).toHaveBeenCalledWith("mail");
    expect(totpBridge.revealSecret).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(SECRET);
    expect(screen.getAllByText("已复制").length).toBeGreaterThan(0);
  });
});

describe("详情的 TOTP 密钥行 显示与丢弃", () => {
  it("点击显示才向主进程取一次密钥并显示明文, 点击隐藏后丢弃", async () => {
    const { totpBridge } = await renderPane();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "显示 TOTP 密钥" }));

    expect(totpBridge.revealSecret).toHaveBeenCalledTimes(1);
    expect(totpBridge.revealSecret).toHaveBeenCalledWith("mail");
    expect(await screen.findByText(SECRET)).toBeDefined();

    await user.click(screen.getByRole("button", { name: "隐藏 TOTP 密钥" }));

    expect(document.body.textContent).not.toContain(SECRET);
    expect(screen.getByText("TOTP 密钥 已隐藏")).toBeDefined();
  });

  it("切换到别的条目再切回来, 已显示的密钥已丢弃, 恢复为遮罩", async () => {
    const { entryStore } = await renderPane();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "显示 TOTP 密钥" }));
    await screen.findByText(SECRET);

    await entryStore.getState().select("forum");
    await screen.findByRole("heading", { name: "论坛" });
    await entryStore.getState().select("mail");

    await waitFor(() =>
      expect(screen.getByText("TOTP 密钥 已隐藏")).toBeDefined(),
    );
    expect(document.body.textContent).not.toContain(SECRET);
  });

  it("取密钥失败时仍是遮罩", async () => {
    await renderPane({
      totpBridgeOverrides: { revealSecret: failingWith("not-found") },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "显示 TOTP 密钥" }));

    expect(document.body.textContent).not.toContain(SECRET);
    expect(screen.getByText("TOTP 密钥 已隐藏")).toBeDefined();
  });
});
