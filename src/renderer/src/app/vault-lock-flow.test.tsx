import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { vaultOperationFailed } from "@shared/vault/vault-operation-result";
import {
  BANK_ENTRY,
  TEST_ENTRIES,
  WALLET_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { getEntryListItems } from "@renderer/testing/entry-list-queries";
import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { renderLockableGate } from "@renderer/testing/render-lockable-gate";
import { TEST_RECOVERY_WORDS } from "@renderer/testing/vault-test-environment";

import { resetWorkspaceOnLock } from "./reset-workspace-on-lock";
import { VaultGate } from "./vault-gate";

/**
 * 假系统里的主密码.
 */
const MASTER_PASSWORD = "current master password";

/**
 * 工作区里的条目: 钱包条目带一个隐藏的自定义字段, 用来检查密文显示状态.
 */
const ENTRIES = [WALLET_ENTRY, ...TEST_ENTRIES];

/**
 * 隐藏的自定义字段里的明文.
 */
const HIDDEN_SECRET = "seed-one seed-two";

/**
 * 渲染整个门控, 接上锁定时重置工作区的订阅, 等条目读取完成.
 * @param options 条目环境的选项, 默认设了主密码, 保险库已解锁.
 * @returns 渲染所用的环境.
 */
function renderGate(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  return renderLockableGate(
    () => <VaultGate />,
    (environment) => resetWorkspaceOnLock(environment.vaultStore, environment),
    { entries: ENTRIES, ...options },
  );
}

/**
 * 点击侧栏的锁定按钮.
 */
async function clickLock(): Promise<void> {
  await userEvent.setup().click(screen.getByRole("button", { name: "锁定" }));
}

/**
 * 在解锁页输入主密码并解锁, 等工作区回来.
 */
async function unlockAgain(): Promise<void> {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("主密码"), MASTER_PASSWORD);
  await user.click(screen.getByRole("button", { name: "解锁" }));
  await screen.findByRole("searchbox", { name: "搜索" });
}

describe("手动锁定: 入口", () => {
  it("锁定按钮在侧栏里设置按钮旁边, 与设置按钮同属底部区域", async () => {
    await renderGate();

    const lock = screen.getByRole("button", { name: "锁定" });
    const settings = screen.getByRole("button", { name: "设置" });

    expect(lock.parentElement).toBe(settings.parentElement);
    expect(lock.closest("aside")).not.toBeNull();
  });

  it("设了主密码时按钮可用", async () => {
    await renderGate();

    expect(
      screen
        .getByRole("button", { name: "锁定" })
        .getAttribute("aria-disabled"),
    ).not.toBe("true");
  });

  it("未设主密码时按钮不可用, 点击也不请求主进程", async () => {
    const environment = await renderGate({ hasMasterPassword: false });

    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "锁定" })
          .getAttribute("aria-disabled"),
      ).toBe("true"),
    );
    await clickLock();

    expect(environment.vaultBridge.lock).not.toHaveBeenCalled();
    expect(environment.vaultStore.getState().status).toBe("unlocked");
    expect(screen.getByRole("searchbox", { name: "搜索" })).toBeDefined();
  });
});

describe("手动锁定: 回到解锁页并清空内存里的数据", () => {
  it("点锁定后显示解锁页, 三栏主界面与条目都不在文档里", async () => {
    await renderGate();

    await clickLock();

    expect(await screen.findByRole("heading", { name: "解锁" })).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(document.body.textContent).not.toContain(BANK_ENTRY.name);
  });

  it("工作区的五个 store 全部重置: 条目, 选中详情, 勾选, 文件夹, 标签, 自定义类型", async () => {
    const environment = await renderGate({ tags: [], folders: [] });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /银行/ }));
    await screen.findByRole("heading", { name: BANK_ENTRY.name });
    environment.batchSelectionStore.getState().toggle(BANK_ENTRY.id);

    await clickLock();

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

  it("选中条目的明文与已显示的密文不在文档里", async () => {
    await renderGate();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /钱包/ }));
    await user.click(
      await screen.findByRole("button", { name: "显示 助记词" }),
    );
    expect(screen.getByText(/seed-one/)).toBeDefined();

    await clickLock();

    await screen.findByRole("heading", { name: "解锁" });
    expect(document.body.textContent).not.toContain("seed-one");
    expect(document.body.textContent).not.toContain("pin-1234");
    expect(document.body.textContent).not.toContain("wallet-account");
  });
});

describe("手动锁定: 再次输入主密码后恢复", () => {
  it("解锁后条目重新读取并显示, 之前显示过的密文重新遮罩", async () => {
    const environment = await renderGate();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /钱包/ }));
    await user.click(
      await screen.findByRole("button", { name: "显示 助记词" }),
    );
    await clickLock();
    await screen.findByRole("heading", { name: "解锁" });

    await unlockAgain();

    await waitFor(() => expect(getEntryListItems()).toHaveLength(4));
    expect(environment.vaultStore.getState().status).toBe("unlocked");
    expect(screen.queryByText(HIDDEN_SECRET)).toBeNull();
    await user.click(screen.getByRole("button", { name: /钱包/ }));
    expect(
      await screen.findByRole("button", { name: "显示 助记词" }),
    ).toBeDefined();
    expect(screen.queryByText(/seed-one/)).toBeNull();
  });

  it("解锁页输错主密码仍停在解锁页, 没有条目", async () => {
    const environment = await renderGate();
    await clickLock();
    await screen.findByRole("heading", { name: "解锁" });
    environment.vaultBridge.unlock = () =>
      Promise.resolve(vaultOperationFailed("wrong-password"));
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("主密码"), "wrong password");
    await user.click(screen.getByRole("button", { name: "解锁" }));

    expect(await screen.findByText(/主密码不正确/)).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(environment.entryStore.getState().entries).toEqual([]);
  });
});

describe("手动锁定: 被拒绝时保持解锁", () => {
  it("有任务进行中: 弹出提示, 条目与选中详情都还在", async () => {
    const environment = await renderGate({
      status: "unlocked",
      bridgeOverrides: {
        lock: () => Promise.resolve(vaultOperationFailed("tasks-running")),
      },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /银行/ }));
    await screen.findByRole("heading", { name: BANK_ENTRY.name });

    await clickLock();

    expect(
      await screen.findByRole("alertdialog", { name: "无法锁定" }),
    ).toBeDefined();
    await user.click(screen.getByRole("button", { name: "知道了" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(environment.vaultStore.getState().status).toBe("unlocked");
    expect(getEntryListItems()).toHaveLength(4);
    expect(
      screen.getByRole("heading", { name: BANK_ENTRY.name }),
    ).toBeDefined();
  });
});

describe("手动锁定: 对话框与浮层随锁定关闭", () => {
  it("新建条目对话框打开时锁定, 对话框关闭, 回到解锁页", async () => {
    const environment = await renderGate();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "新建条目" }));
    await screen.findByRole("dialog");

    await act(() => environment.vaultStore.getState().lock());

    expect(await screen.findByRole("heading", { name: "解锁" })).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("设置对话框里显示着恢复词时锁定, 对话框与恢复词都不在文档里", async () => {
    const environment = await renderGate();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "设置" }));
    await user.click(
      await screen.findByRole("button", { name: "查看恢复密钥" }),
    );
    const verify = within(
      await screen.findByRole("dialog", { name: "查看恢复密钥" }),
    );
    await user.type(
      await verify.findByLabelText("当前主密码"),
      MASTER_PASSWORD,
    );
    await user.click(verify.getByRole("button", { name: "查看" }));
    expect(
      await screen.findByRole("list", { name: "24 个恢复词" }),
    ).toBeDefined();
    expect(
      screen.getAllByText(TEST_RECOVERY_WORDS[0] ?? "").length,
    ).toBeGreaterThan(0);

    await act(() => environment.vaultStore.getState().lock());

    expect(await screen.findByRole("heading", { name: "解锁" })).toBeDefined();
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    expect(screen.queryByRole("list", { name: "24 个恢复词" })).toBeNull();
    TEST_RECOVERY_WORDS.forEach((word) =>
      expect(document.body.textContent).not.toContain(word),
    );
  });
});
