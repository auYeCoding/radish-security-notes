import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { emailBackupSucceeded } from "@shared/email-backup/email-backup-result";
import { exportSucceeded } from "@shared/export/export-result";
import { restoreSucceeded } from "@shared/restore/restore-result";
import type { MasterPasswordBridge } from "@shared/vault/master-password-bridge";

import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import type { EntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import { FAKE_EMAIL_BACKUP_VIEW } from "@renderer/testing/fake-email-backup-bridge";
import { FAKE_EXPORT_SCOPE_SUMMARY } from "@renderer/testing/fake-export-bridge";
import { createFakeMasterPasswordBridge } from "@renderer/testing/fake-master-password-bridge";
import { FAKE_RESTORE_PREVIEW } from "@renderer/testing/fake-restore-bridge";
import {
  isDialogMounted,
  openSettingsDialogWith,
} from "@renderer/testing/open-settings-dialog";

import { SettingsEntry } from "./settings-entry";

/**
 * 合规的新主密码.
 */
const NEW_PASSWORD = "a long enough password";

/**
 * 当前的主密码.
 */
const CURRENT_PASSWORD = "current master password";

/**
 * 切换前后要检查的三个对话框, 它们打开时才向主进程取 "是否要求输入主密码".
 */
const LINKED_DIALOGS = ["导出数据", "邮箱备份", "从备份恢复"] as const;

/**
 * 三个对话框之一的名称.
 */
type LinkedDialog = (typeof LINKED_DIALOGS)[number];

/**
 * 生成设置入口元素.
 * @returns 设置入口元素.
 */
function createEntry(): React.ReactElement {
  return <SettingsEntry />;
}

/**
 * 打开设置对话框后拿到的结果.
 */
interface LinkedSettings {
  /**
   * 与三个对话框的假桥联动的假主密码开关桥.
   */
  readonly bridge: MasterPasswordBridge;
  /**
   * 渲染所用的条目环境.
   */
  readonly environment: EntryTestEnvironment;
}

/**
 * 打开设置对话框, 让导出, 邮箱备份与恢复三个假桥的 "是否设了主密码" 都跟着同一个假主密码开关桥
 * 变化, 与真实的主进程每次重读密钥文件一致.
 * @param hasMasterPassword 初始是否设了主密码.
 * @returns 假主密码开关桥与条目环境.
 */
async function openLinkedSettings(
  hasMasterPassword: boolean,
): Promise<LinkedSettings> {
  const bridge = createFakeMasterPasswordBridge(hasMasterPassword);
  const environment = await openSettingsDialogWith(createEntry, {
    entries: TEST_ENTRIES,
    masterPasswordBridgeOverrides: bridge,
    exportBridgeOverrides: {
      describeScope: async () =>
        exportSucceeded({
          ...FAKE_EXPORT_SCOPE_SUMMARY,
          hasMasterPassword: await bridge.hasMasterPassword(),
        }),
    },
    emailBackupBridgeOverrides: {
      getSettings: async () =>
        emailBackupSucceeded({
          ...FAKE_EMAIL_BACKUP_VIEW,
          requiresMasterPassword: await bridge.hasMasterPassword(),
        }),
    },
    restoreBridgeOverrides: {
      chooseFile: async () =>
        restoreSucceeded({
          status: "ready" as const,
          preview: {
            ...FAKE_RESTORE_PREVIEW,
            requiresMasterPassword: await bridge.hasMasterPassword(),
          },
        }),
    },
  });
  await act(() => environment.entryStore.getState().load());
  return { bridge, environment };
}

/**
 * 在对话框里走到出现主密码输入的那一步.
 * @param name 对话框的名称.
 * @returns 走到之后兑现.
 */
async function goToMasterPasswordStep(name: LinkedDialog): Promise<void> {
  const user = userEvent.setup();
  if (name === "导出数据") {
    await waitFor(() => expect(screen.queryByText("正在统计...")).toBeNull());
    await user.click(screen.getByRole("button", { name: "下一步" }));
    await screen.findByText("确认导出");
    return;
  }
  if (name === "邮箱备份") {
    await waitFor(() =>
      expect(screen.queryByText("正在读取设置...")).toBeNull(),
    );
    return;
  }
  await user.click(
    await screen.findByRole("button", { name: "选择备份文件..." }),
  );
  await screen.findByText("确认恢复内容");
}

/**
 * 打开设置里的一个对话框, 看它是否要求输入主密码, 再用 Escape 关掉它回到设置对话框.
 * @param name 对话框的名称.
 * @returns 要求输入主密码时为 true.
 */
async function readRequirement(name: LinkedDialog): Promise<boolean> {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name }));
  const dialog = within(await screen.findByRole("dialog", { name }));
  await goToMasterPasswordStep(name);
  const isRequired = dialog.queryByLabelText("主密码") !== null;
  await user.keyboard("{Escape}");
  await waitFor(() => expect(isDialogMounted(name)).toBe(false));
  return isRequired;
}

/**
 * 点开关, 在开启对话框里设置新主密码, 等开关变为已开启.
 * @returns 完成后兑现.
 */
async function turnOn(): Promise<void> {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("switch", { name: "未开启" }));
  const dialog = within(
    await screen.findByRole("dialog", { name: "开启主密码" }),
  );
  await user.type(dialog.getByLabelText("主密码"), NEW_PASSWORD);
  await user.type(dialog.getByLabelText("确认主密码"), NEW_PASSWORD);
  await user.click(dialog.getByRole("button", { name: "开启主密码" }));
  await screen.findByRole("switch", { name: "已开启" });
}

/**
 * 点开关, 在关闭对话框里输入当前主密码并勾选已了解, 等开关变为未开启.
 * @returns 完成后兑现.
 */
async function turnOff(): Promise<void> {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("switch", { name: "已开启" }));
  const dialog = within(
    await screen.findByRole("dialog", { name: "关闭主密码" }),
  );
  await user.type(dialog.getByLabelText("当前主密码"), CURRENT_PASSWORD);
  await user.click(
    dialog.getByRole("checkbox", { name: "我了解关闭后的保护强度" }),
  );
  await user.click(dialog.getByRole("button", { name: "关闭主密码" }));
  await screen.findByRole("switch", { name: "未开启" });
}

describe("设置入口: 安全分区", () => {
  it("设置对话框里数据分区之后有安全分区, 主密码开关反映当前模式", async () => {
    await openLinkedSettings(true);

    const section = within(screen.getByRole("region", { name: "安全" }));

    expect(section.getByText("主密码")).toBeDefined();
    expect(
      (await section.findByRole("switch", { name: "已开启" })).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });

  it("开启成功后设置对话框仍在, 开关变为已开启", async () => {
    const { bridge } = await openLinkedSettings(false);

    await turnOn();

    expect(isDialogMounted("设置")).toBe(true);
    expect(isDialogMounted("开启主密码")).toBe(false);
    expect(bridge.enable).toHaveBeenCalledWith(NEW_PASSWORD);
  });

  it("关闭成功后设置对话框仍在, 开关变为未开启", async () => {
    const { bridge } = await openLinkedSettings(true);

    await turnOff();

    expect(isDialogMounted("设置")).toBe(true);
    expect(isDialogMounted("关闭主密码")).toBe(false);
    expect(bridge.disable).toHaveBeenCalledWith(CURRENT_PASSWORD);
  });
});

describe("设置入口: 切换后三个对话框对主密码的要求立即随之变化", () => {
  it.each(LINKED_DIALOGS)(
    "开启主密码后, %s 对话框由不要求变为要求输入主密码",
    async (name) => {
      await openLinkedSettings(false);
      expect(await readRequirement(name)).toBe(false);

      await turnOn();

      expect(await readRequirement(name)).toBe(true);
    },
  );

  it.each(LINKED_DIALOGS)(
    "关闭主密码后, %s 对话框由要求变为不要求输入主密码",
    async (name) => {
      await openLinkedSettings(true);
      expect(await readRequirement(name)).toBe(true);

      await turnOff();

      expect(await readRequirement(name)).toBe(false);
    },
  );
});
