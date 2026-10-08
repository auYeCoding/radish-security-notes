import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { AutoLockReason } from "@shared/vault/auto-lock-reason";
import type { VaultEventsBridge } from "@shared/vault/vault-events-bridge";
import {
  BANK_ENTRY,
  TEST_ENTRIES,
  WALLET_ENTRY,
} from "@renderer/testing/entry-fixtures";
import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { renderLockableGate } from "@renderer/testing/render-lockable-gate";

import { resetWorkspaceOnLock } from "./reset-workspace-on-lock";
import { VaultGate } from "./vault-gate";
import { watchAutoLock } from "./watch-auto-lock";

/**
 * 假系统里的主密码.
 */
const MASTER_PASSWORD = "current master password";

/**
 * 主进程推送自动锁定的模拟: 渲染之前接上订阅, 测试里手动推送.
 */
interface RenderedGate {
  /**
   * 渲染所用的环境.
   */
  readonly environment: EntryTestEnvironment;
  /**
   * 模拟主进程推送一次自动锁定.
   */
  readonly push: (reason: AutoLockReason) => void;
}

/**
 * 渲染整个门控, 接上锁定时重置工作区的订阅与主进程自动锁定的订阅, 等条目读取完成.
 * @param options 条目环境的选项, 默认设了主密码, 保险库已解锁.
 * @returns 渲染所用的环境与推送函数.
 */
async function renderGate(
  options: EntryTestEnvironmentOptions = {},
): Promise<RenderedGate> {
  const listeners = new Set<(reason: AutoLockReason) => void>();
  const events: VaultEventsBridge = {
    onAutoLocked: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
  const environment = await renderLockableGate(
    () => <VaultGate />,
    (rendered) => {
      resetWorkspaceOnLock(rendered.vaultStore, rendered);
      watchAutoLock(rendered.vaultStore, events);
    },
    { entries: [WALLET_ENTRY, ...TEST_ENTRIES], ...options },
  );
  return {
    environment,
    push: (reason) => listeners.forEach((listener) => listener(reason)),
  };
}

/**
 * 点开设置对话框并取出名为 安全 的分区.
 * @returns 安全分区内的查询.
 */
async function openSecuritySection(): Promise<ReturnType<typeof within>> {
  await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));
  return within(await screen.findByRole("region", { name: "安全" }));
}

describe("自动锁定: 主进程推送后回到解锁页并清空内存里的数据", () => {
  it.each([
    ["idle", "因长时间没有操作, 保险库已自动锁定."],
    ["screen-lock", "因系统锁屏, 保险库已自动锁定."],
    ["sleep", "因系统休眠, 保险库已自动锁定."],
  ] as const)(
    "原因 %s: 三栏主界面与条目消失, 解锁页上有一行原因说明",
    async (reason, notice) => {
      const { push } = await renderGate();

      act(() => push(reason));

      expect(
        await screen.findByRole("heading", { name: "解锁" }),
      ).toBeDefined();
      expect(screen.getByRole("status").textContent).toBe(notice);
      expect(screen.queryByRole("searchbox")).toBeNull();
      expect(screen.queryByRole("complementary")).toBeNull();
      expect(document.body.textContent).not.toContain(BANK_ENTRY.name);
    },
  );

  it("复用手动锁定的统一重置: 工作区的五个 store 全部回到初始状态", async () => {
    const { environment, push } = await renderGate({ tags: [], folders: [] });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /银行/ }));
    await screen.findByRole("heading", { name: BANK_ENTRY.name });
    environment.batchSelectionStore.getState().toggle(BANK_ENTRY.id);

    act(() => push("idle"));

    await screen.findByRole("heading", { name: "解锁" });
    expect(environment.entryStore.getState().entries).toEqual([]);
    expect(environment.entryStore.getState().selection).toEqual({
      status: "none",
    });
    expect(environment.entryStore.getState().loadStatus).toBe("loading");
    expect(environment.batchSelectionStore.getState().checkedIds.size).toBe(0);
    expect(environment.folderStore.getState().loadStatus).toBe("loading");
    expect(environment.tagStore.getState().loadStatus).toBe("loading");
    expect(environment.entryTypeStore.getState().loadStatus).toBe("loading");
  });
});

describe("自动锁定: 对话框与重新解锁", () => {
  it("设置对话框开着时被自动锁定, 对话框一并消失", async () => {
    const { push } = await renderGate();
    await openSecuritySection();

    act(() => push("sleep"));

    await screen.findByRole("heading", { name: "解锁" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("输入主密码重新解锁后回到工作区, 条目重新读取, 原因说明消失", async () => {
    const { environment, push } = await renderGate();
    act(() => push("idle"));
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("主密码"), MASTER_PASSWORD);
    await user.click(screen.getByRole("button", { name: "解锁" }));

    await screen.findByRole("searchbox", { name: "搜索" });
    expect(screen.queryByText(/保险库已自动锁定/)).toBeNull();
    expect(environment.vaultStore.getState().lockReason).toBeUndefined();
    expect(await screen.findByText(BANK_ENTRY.name)).toBeDefined();
  });

  it("重新解锁后再次被自动锁定仍然生效, 并显示新的原因", async () => {
    const { push } = await renderGate();
    act(() => push("idle"));
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("主密码"), MASTER_PASSWORD);
    await user.click(screen.getByRole("button", { name: "解锁" }));
    await screen.findByRole("searchbox", { name: "搜索" });

    act(() => push("screen-lock"));

    await screen.findByRole("heading", { name: "解锁" });
    expect(screen.getByRole("status").textContent).toBe(
      "因系统锁屏, 保险库已自动锁定.",
    );
  });
});

describe("自动锁定: 设置项跟随主密码开关", () => {
  it("设了主密码时三个控件可用, 没有原因说明", async () => {
    await renderGate({ hasMasterPassword: true });

    const section = await openSecuritySection();

    for (const name of ["空闲自动锁定", "锁屏时锁定", "休眠时锁定"]) {
      const group = within(section.getByRole("group", { name }));
      expect(group.getByRole("switch").getAttribute("aria-disabled")).not.toBe(
        "true",
      );
    }
    expect(section.queryByRole("note")).toBeNull();
  });
});

describe("自动锁定: 没设主密码时的设置项", () => {
  it("没设主密码时三个控件不可用并说明原因, 点击不保存", async () => {
    const { environment } = await renderGate({ hasMasterPassword: false });

    const section = await openSecuritySection();

    await waitFor(() =>
      expect(section.getByRole("note").textContent).toBe(
        "未设置主密码, 自动锁定不会生效. 先在上方开启主密码.",
      ),
    );
    for (const name of ["空闲自动锁定", "锁屏时锁定", "休眠时锁定"]) {
      const toggle = within(section.getByRole("group", { name })).getByRole(
        "switch",
      );
      expect(toggle.getAttribute("aria-disabled")).toBe("true");
      await userEvent.setup().click(toggle);
    }
    expect(environment.bridge.setAutoLock).not.toHaveBeenCalled();
  });

  it("在同一个设置对话框里开启主密码后, 三个控件立即可用且原因说明消失", async () => {
    await renderGate({ hasMasterPassword: false });
    const section = await openSecuritySection();
    await waitFor(() => expect(section.getByRole("note")).toBeDefined());
    const user = userEvent.setup();

    await user.click(await section.findByRole("switch", { name: "未开启" }));
    const dialog = within(
      await screen.findByRole("dialog", { name: "开启主密码" }),
    );
    await user.type(dialog.getByLabelText("主密码"), MASTER_PASSWORD);
    await user.type(dialog.getByLabelText("确认主密码"), MASTER_PASSWORD);
    await user.click(dialog.getByRole("button", { name: "开启主密码" }));

    await waitFor(() => expect(section.queryByRole("note")).toBeNull());
    const idle = within(section.getByRole("group", { name: "空闲自动锁定" }));
    expect(idle.getByRole("switch").getAttribute("aria-disabled")).not.toBe(
      "true",
    );
  });
});

describe("自动锁定: 在对话框里关闭主密码与保存设置", () => {
  it("在对话框里关闭主密码后, 三个控件立即变为不可用并出现原因说明", async () => {
    await renderGate({ hasMasterPassword: true });
    const section = await openSecuritySection();
    const user = userEvent.setup();

    await user.click(await section.findByRole("switch", { name: "已开启" }));
    const dialog = within(
      await screen.findByRole("dialog", { name: "关闭主密码" }),
    );
    await user.type(dialog.getByLabelText("当前主密码"), MASTER_PASSWORD);
    await user.click(
      dialog.getByRole("checkbox", { name: "我了解关闭后的保护强度" }),
    );
    await user.click(dialog.getByRole("button", { name: "关闭主密码" }));

    await waitFor(() => expect(section.getByRole("note")).toBeDefined());
    const sleep = within(section.getByRole("group", { name: "休眠时锁定" }));
    expect(sleep.getByRole("switch").getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("设了主密码时关掉休眠开关会保存整个设置", async () => {
    const { environment } = await renderGate({ hasMasterPassword: true });
    const section = await openSecuritySection();

    await userEvent
      .setup()
      .click(
        within(section.getByRole("group", { name: "休眠时锁定" })).getByRole(
          "switch",
        ),
      );

    await waitFor(() =>
      expect(environment.bridge.setAutoLock).toHaveBeenCalledWith({
        isIdleLockEnabled: true,
        idleMinutes: 15,
        isScreenLockEnabled: true,
        isSleepLockEnabled: false,
      }),
    );
  });
});
