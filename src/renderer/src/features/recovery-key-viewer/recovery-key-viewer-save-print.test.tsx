import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  openRecoveryKeyVerifyWith,
  submitRecoveryKeyVerification,
} from "@renderer/testing/open-recovery-key-dialog";
import { TEST_RECOVERY_WORDS } from "@renderer/testing/vault-test-environment";

import { RecoveryKeyViewer } from "./recovery-key-viewer";
import { RECOVERY_PRINT_KIT_ATTRIBUTE } from "./recovery-key-print-portal";

/**
 * 查找 body 直接子元素上的打印套件容器.
 * @returns 打印套件容器, 页面上没有时为 null.
 */
function findPrintKit(): Element | null {
  return document.body.querySelector(
    `:scope > [${RECOVERY_PRINT_KIT_ATTRIBUTE}]`,
  );
}

/**
 * 渲染入口, 点开验证对话框并通过验证, 等恢复词显示出来.
 * @param user 用户事件.
 * @returns 条目环境.
 */
async function openShownWords(
  user: ReturnType<typeof userEvent.setup>,
): ReturnType<typeof openRecoveryKeyVerifyWith> {
  const environment = await openRecoveryKeyVerifyWith(
    () => <RecoveryKeyViewer />,
    { hasMasterPassword: false },
    user,
  );
  await submitRecoveryKeyVerification(user);
  await screen.findByRole("list", { name: "24 个恢复词" });
  return environment;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("查看恢复密钥: 保存手段", () => {
  it("只有打印恢复套件与保存为文本文件, 没有任何复制入口", async () => {
    await openShownWords(userEvent.setup());

    expect(screen.getByRole("button", { name: "打印恢复套件" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "保存为文本文件" }),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /复制|copy/i })).toBeNull();
    expect(
      screen.getByText("为避免被其它程序读取, 这里不提供复制到剪贴板."),
    ).toBeDefined();
  });

  it("保存为文本文件时把 24 个词交给主进程现有的保存通道", async () => {
    const user = userEvent.setup();
    const environment = await openShownWords(user);

    await user.click(screen.getByRole("button", { name: "保存为文本文件" }));

    expect(await screen.findByText("已保存文本文件.")).toBeDefined();
    expect(environment.recoveryBridge.saveTextFile).toHaveBeenCalledWith(
      TEST_RECOVERY_WORDS,
    );
  });

  it("点击打印恢复套件调用页面打印", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const user = userEvent.setup();
    await openShownWords(user);

    await user.click(screen.getByRole("button", { name: "打印恢复套件" }));

    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe("查看恢复密钥: 打印版式", () => {
  it("版式挂在 body 的直接子元素上, 不在设置对话框里, 带 24 个词", async () => {
    await openShownWords(userEvent.setup());

    const kit = findPrintKit();
    expect(kit).not.toBeNull();
    expect(kit?.parentElement).toBe(document.body);
    expect(screen.getByRole("dialog").contains(kit)).toBe(false);
    const items = kit?.querySelectorAll("li") ?? [];
    expect(items).toHaveLength(24);
    expect(items[0]?.textContent).toBe("1.abandon");
    expect(kit?.querySelector("section")?.className).toContain("print:flex");
  });

  it("验证步骤与对话框关闭后页面上没有打印版式", async () => {
    const user = userEvent.setup();
    await openShownWords(user);

    await user.click(screen.getByRole("button", { name: "隐藏" }));
    await screen.findByRole("dialog", { name: "查看恢复密钥" });
    expect(findPrintKit()).toBeNull();

    await submitRecoveryKeyVerification(user);
    await screen.findByRole("list", { name: "24 个恢复词" });
    expect(findPrintKit()).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "完成" }));
    await waitFor(() => expect(findPrintKit()).toBeNull());
  });
});
