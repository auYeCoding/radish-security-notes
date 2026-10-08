import { render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";

import type { AutoLockReason } from "@shared/vault/auto-lock-reason";
import {
  createVaultTestEnvironment,
  type VaultTestEnvironment,
} from "@renderer/testing/vault-test-environment";

import { UnlockScreen } from "./unlock-screen";

/**
 * 每种自动锁定原因在中文界面下的说明.
 */
const NOTICE_TEXT: Readonly<Record<AutoLockReason, string>> = {
  idle: "因长时间没有操作, 保险库已自动锁定.",
  "screen-lock": "因系统锁屏, 保险库已自动锁定.",
  sleep: "因系统休眠, 保险库已自动锁定.",
};

/**
 * 在已解锁的保险库里按指定原因自动锁定, 然后渲染解锁页.
 * @param reason 自动锁定的原因, 不给时不锁定 (保险库一开始就是锁定的).
 * @returns 渲染所用的环境.
 */
async function renderUnlockAfterAutoLock(
  reason?: AutoLockReason,
): Promise<VaultTestEnvironment> {
  const environment = await createVaultTestEnvironment({
    status: reason === undefined ? "locked" : "unlocked",
  });
  if (reason !== undefined) {
    environment.vaultStore.getState().applyAutoLock(reason);
  }
  render(<UnlockScreen />, { wrapper: environment.Providers });
  return environment;
}

describe("UnlockScreen: 自动锁定原因说明", () => {
  it.each(["idle", "screen-lock", "sleep"] as const)(
    "因 %s 自动锁定后, 表单上方有一行说明, 是礼貌朗读的状态提示",
    async (reason) => {
      await renderUnlockAfterAutoLock(reason);

      const notice = screen.getByRole("status");

      expect(notice.textContent).toBe(NOTICE_TEXT[reason]);
      expect(screen.getByLabelText("主密码")).toBeDefined();
    },
  );

  it("说明在主密码输入框之前", async () => {
    await renderUnlockAfterAutoLock("idle");

    const notice = screen.getByRole("status");
    const field = screen.getByLabelText("主密码");

    expect(
      notice.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("启动时就是锁定的 (没有自动锁定原因) 不显示说明", async () => {
    await renderUnlockAfterAutoLock();

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("手动锁定后不显示说明", async () => {
    const environment = await createVaultTestEnvironment({
      status: "unlocked",
    });
    await environment.vaultStore.getState().lock();
    render(<UnlockScreen />, { wrapper: environment.Providers });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("说明随界面语言切换", async () => {
    const environment = await renderUnlockAfterAutoLock("sleep");

    await act(() => environment.store.getState().setLanguage("en"));

    expect(screen.getByRole("status").textContent).toBe(
      "The vault was locked automatically because the system went to sleep.",
    );
  });

  it("解锁成功后自动锁定的原因被清除", async () => {
    const environment = await renderUnlockAfterAutoLock("idle");

    await act(async () => {
      await environment.vaultStore.getState().unlock("a long password");
    });

    expect(environment.vaultStore.getState().lockReason).toBeUndefined();
  });
});
