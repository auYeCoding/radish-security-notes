import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { isDialogMounted } from "@renderer/testing/open-settings-dialog";
import { renderLockableGate } from "@renderer/testing/render-lockable-gate";

import { resetWorkspaceOnLock } from "./reset-workspace-on-lock";
import { VaultGate } from "./vault-gate";

/**
 * 在设置里开启或确认关闭时用的主密码.
 */
const PASSWORD = "a long enough password";

/**
 * 渲染整个门控, 接上锁定时重置工作区的订阅.
 * @param options 条目环境的选项, 例如是否设了主密码.
 * @returns 渲染所用的环境.
 */
function renderGate(
  options: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  return renderLockableGate(
    () => <VaultGate />,
    (environment) => resetWorkspaceOnLock(environment.vaultStore, environment),
    { entries: TEST_ENTRIES, ...options },
  );
}

/**
 * 读锁定按钮当前是否不可用.
 * @returns 不可用时为 true.
 */
function isLockUnavailable(): boolean {
  return (
    screen
      .getByRole("button", { name: "锁定" })
      .getAttribute("aria-disabled") === "true"
  );
}

/**
 * 打开设置对话框, 点主密码开关, 在弹出的对话框里提交, 等开关翻转, 再按 Esc 关闭设置对话框.
 * @param from 点开关前的状态: 未开启时要开启, 已开启时要关闭.
 * @returns 设置对话框关闭之后兑现.
 */
async function switchMasterPasswordInSettings(
  from: "未开启" | "已开启",
): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "设置" }));
  await user.click(await screen.findByRole("switch", { name: from }));
  if (from === "未开启") {
    const dialog = within(
      await screen.findByRole("dialog", { name: "开启主密码" }),
    );
    await user.type(dialog.getByLabelText("主密码"), PASSWORD);
    await user.type(dialog.getByLabelText("确认主密码"), PASSWORD);
    await user.click(dialog.getByRole("button", { name: "开启主密码" }));
    await screen.findByRole("switch", { name: "已开启" });
  } else {
    const dialog = within(
      await screen.findByRole("dialog", { name: "关闭主密码" }),
    );
    await user.type(dialog.getByLabelText("当前主密码"), PASSWORD);
    await user.click(
      dialog.getByRole("checkbox", { name: "我了解关闭后的保护强度" }),
    );
    await user.click(dialog.getByRole("button", { name: "关闭主密码" }));
    await screen.findByRole("switch", { name: "未开启" });
  }
  await user.keyboard("{Escape}");
  await waitFor(() => expect(isDialogMounted("设置")).toBe(false));
}

describe("手动锁定: 锁定按钮跟随设置里的主密码开关", () => {
  it("未设主密码时在设置里开启, 关闭设置后锁定按钮变为可用并能锁定", async () => {
    const environment = await renderGate({ hasMasterPassword: false });
    await waitFor(() => expect(isLockUnavailable()).toBe(true));

    await switchMasterPasswordInSettings("未开启");

    await waitFor(() => expect(isLockUnavailable()).toBe(false));
    await userEvent.setup().click(screen.getByRole("button", { name: "锁定" }));
    expect(await screen.findByRole("heading", { name: "解锁" })).toBeDefined();
    expect(environment.vaultBridge.lock).toHaveBeenCalledTimes(1);
  });

  it("设了主密码时在设置里关闭, 关闭设置后锁定按钮变为不可用", async () => {
    const environment = await renderGate({ hasMasterPassword: true });
    expect(isLockUnavailable()).toBe(false);

    await switchMasterPasswordInSettings("已开启");

    await waitFor(() => expect(isLockUnavailable()).toBe(true));
    await userEvent.setup().click(screen.getByRole("button", { name: "锁定" }));
    expect(environment.vaultBridge.lock).not.toHaveBeenCalled();
    expect(environment.vaultStore.getState().status).toBe("unlocked");
  });
});
