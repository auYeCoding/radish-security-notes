import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import { createFakeMasterPasswordBridge } from "@renderer/testing/fake-master-password-bridge";
import {
  isDialogMounted,
  openSettingsDialogWith,
} from "@renderer/testing/open-settings-dialog";

import { SettingsEntry } from "./settings-entry";

/**
 * 当前的主密码.
 */
const CURRENT_PASSWORD = "current master password";

/**
 * 生成设置入口元素.
 * @returns 设置入口元素.
 */
function createEntry(): React.ReactElement {
  return <SettingsEntry />;
}

/**
 * 打开设置对话框, 假主密码开关桥初始是否设了主密码由参数决定.
 * @param hasMasterPassword 初始是否设了主密码.
 * @returns 打开完成后兑现.
 */
async function openSettings(hasMasterPassword: boolean): Promise<void> {
  await openSettingsDialogWith(createEntry, {
    entries: TEST_ENTRIES,
    masterPasswordBridgeOverrides:
      createFakeMasterPasswordBridge(hasMasterPassword),
  });
}

describe("设置入口: 安全分区的恢复密钥行", () => {
  it("安全分区里主密码行之后有恢复密钥行, 带名称, 说明与查看按钮", async () => {
    await openSettings(false);

    const section = within(screen.getByRole("region", { name: "安全" }));
    const text = section.getByText("恢复密钥").closest("section")?.textContent;

    expect(text).toBeDefined();
    const expectedInOrder = [
      "主密码",
      "恢复密钥",
      "恢复密钥由数据密钥确定, 可随时重新查看, 内容不变.",
      "查看恢复密钥",
    ];
    const positions = expectedInOrder.map((part) => text?.indexOf(part) ?? -1);
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(section.getByRole("button", { name: "查看恢复密钥" })).toBeDefined();
  });

  it("点查看恢复密钥叠在设置对话框之上打开验证对话框, 设置对话框仍在", async () => {
    const user = userEvent.setup();
    await openSettings(false);

    await user.click(screen.getByRole("button", { name: "查看恢复密钥" }));

    expect(
      await screen.findByRole("dialog", { name: "查看恢复密钥" }),
    ).toBeDefined();
    expect(isDialogMounted("设置")).toBe(true);
  });
});

describe("设置入口: 恢复密钥的验证方式跟随主密码设置", () => {
  it("在同一个设置对话框里开启主密码后, 查看恢复密钥改为要求输入主密码", async () => {
    const user = userEvent.setup();
    await openSettings(false);
    await user.click(await screen.findByRole("switch", { name: "未开启" }));
    const enableDialog = within(
      await screen.findByRole("dialog", { name: "开启主密码" }),
    );
    await user.type(enableDialog.getByLabelText("主密码"), CURRENT_PASSWORD);
    await user.type(
      enableDialog.getByLabelText("确认主密码"),
      CURRENT_PASSWORD,
    );
    await user.click(enableDialog.getByRole("button", { name: "开启主密码" }));
    await screen.findByRole("switch", { name: "已开启" });

    await user.click(screen.getByRole("button", { name: "查看恢复密钥" }));

    expect(await screen.findByLabelText("当前主密码")).toBeDefined();
    expect(
      screen.queryByRole("checkbox", { name: "我已确认周围没有他人查看" }),
    ).toBeNull();
  });

  it("展示恢复词时打印版式在设置对话框之外, 关闭展示后页面上没有恢复词", async () => {
    const user = userEvent.setup();
    await openSettings(false);
    await user.click(screen.getByRole("button", { name: "查看恢复密钥" }));
    await user.click(
      await screen.findByRole("checkbox", {
        name: "我已确认周围没有他人查看",
      }),
    );
    await user.click(screen.getByRole("button", { name: "查看" }));

    await screen.findByRole("list", { name: "24 个恢复词" });
    const kit = document.body.querySelector(
      ":scope > [data-recovery-print-kit]",
    );
    expect(kit).not.toBeNull();
    expect(
      screen
        .getAllByRole("dialog", { hidden: true })
        .some((dialog) => dialog.contains(kit)),
    ).toBe(false);
    await user.click(screen.getByRole("button", { name: "完成" }));

    await waitFor(() => expect(isDialogMounted("恢复密钥")).toBe(false));
    expect(document.body.textContent).not.toContain("abandon");
    expect(isDialogMounted("设置")).toBe(true);
  });
});
