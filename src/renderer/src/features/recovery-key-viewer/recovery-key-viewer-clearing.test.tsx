import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, type MockInstance } from "vitest";

import {
  openRecoveryKeyVerifyWith,
  submitRecoveryKeyVerification,
} from "@renderer/testing/open-recovery-key-dialog";

import { RecoveryKeyViewer } from "./recovery-key-viewer";
import { RECOVERY_KEY_AUTO_HIDE_MILLISECONDS } from "./use-auto-hide";

/**
 * 在由系统保护的环境里渲染入口, 点开验证对话框并通过验证, 等恢复词显示出来.
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

/**
 * 页面上是否有恢复词.
 * @returns 有时为 true.
 */
function hasWordsOnPage(): boolean {
  return document.body.textContent?.includes("abandon") ?? false;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("查看恢复密钥: 关闭与隐藏后词被清除", () => {
  it("点完成关闭对话框, 页面上没有词, 再打开要重新验证", async () => {
    const user = userEvent.setup();
    const environment = await openShownWords(user);

    await user.click(screen.getByRole("button", { name: "完成" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(hasWordsOnPage()).toBe(false);
    await user.click(screen.getByRole("button", { name: "查看恢复密钥" }));
    expect(
      await screen.findByRole("dialog", { name: "查看恢复密钥" }),
    ).toBeDefined();
    expect(screen.queryByRole("list", { name: "24 个恢复词" })).toBeNull();
    expect(environment.recoveryBridge.viewKey).toHaveBeenCalledTimes(1);
  });

  it("按 Escape 关闭对话框同样清除词", async () => {
    const user = userEvent.setup();
    await openShownWords(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(hasWordsOnPage()).toBe(false);
  });

  it("点隐藏回到验证步骤, 词被清除, 再看必须重新验证并重新向主进程取词", async () => {
    const user = userEvent.setup();
    const environment = await openShownWords(user);

    await user.click(screen.getByRole("button", { name: "隐藏" }));

    expect(
      await screen.findByRole("dialog", { name: "查看恢复密钥" }),
    ).toBeDefined();
    expect(hasWordsOnPage()).toBe(false);
    expect(screen.queryByText(/已自动隐藏/)).toBeNull();
    await submitRecoveryKeyVerification(user);
    await screen.findByRole("list", { name: "24 个恢复词" });
    expect(environment.recoveryBridge.viewKey).toHaveBeenCalledTimes(2);
  });
});

/**
 * 恢复词显示时登记的一个自动隐藏计时.
 */
interface AutoHideTimer {
  /**
   * 计时到点时要执行的回调.
   */
  readonly callback: () => void;
  /**
   * 计时器编号, 取消计时时要传给 `clearTimeout`.
   */
  readonly timerId: number;
}

/**
 * 找出恢复词显示时登记的自动隐藏计时: 延时恰为自动隐藏时长的那些 setTimeout 调用.
 * @param spy 监视 `window.setTimeout` 的间谍.
 * @returns 每个计时的到点回调与计时器编号, 按登记先后排列.
 */
function findAutoHideTimers(
  spy: MockInstance<typeof window.setTimeout>,
): AutoHideTimer[] {
  return spy.mock.calls.flatMap(([handler, delay], index) =>
    delay === RECOVERY_KEY_AUTO_HIDE_MILLISECONDS &&
    typeof handler === "function"
      ? [{ callback: () => handler(), timerId: spy.mock.results[index]?.value }]
      : [],
  );
}

describe("查看恢复密钥: 显示满 120 秒自动隐藏", () => {
  it("显示时登记一个 120 秒的计时, 到点后词被清除并提示需要重新验证", async () => {
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    const user = userEvent.setup();
    await openShownWords(user);

    const timers = findAutoHideTimers(setTimeoutSpy);
    expect(timers).toHaveLength(1);
    expect(hasWordsOnPage()).toBe(true);
    act(() => timers[0]?.callback());

    expect(
      await screen.findByRole("dialog", { name: "查看恢复密钥" }),
    ).toBeDefined();
    expect(hasWordsOnPage()).toBe(false);
    expect(
      screen.getByText(
        "为保护安全, 恢复词已自动隐藏. 需要重新验证才能再次查看.",
      ),
    ).toBeDefined();
  });

  it("自动隐藏后重新验证才能再看, 再次显示又登记新的计时", async () => {
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    const user = userEvent.setup();
    const environment = await openShownWords(user);
    act(() => findAutoHideTimers(setTimeoutSpy)[0]?.callback());
    await screen.findByText(/已自动隐藏/);

    await submitRecoveryKeyVerification(user);
    await screen.findByRole("list", { name: "24 个恢复词" });

    expect(environment.recoveryBridge.viewKey).toHaveBeenCalledTimes(2);
    expect(findAutoHideTimers(setTimeoutSpy)).toHaveLength(2);
    expect(hasWordsOnPage()).toBe(true);
  });

  it("手动关闭时取消计时", async () => {
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const user = userEvent.setup();
    await openShownWords(user);
    const timerId = findAutoHideTimers(setTimeoutSpy)[0]?.timerId;

    await user.click(screen.getByRole("button", { name: "完成" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(timerId).toBeDefined();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
  });
});
