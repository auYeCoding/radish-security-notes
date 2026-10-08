import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@renderer/components/ui/button";
import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

import {
  SettingsSecuritySection,
  type SettingsSecurityEntries,
} from "./settings-security-section";

/**
 * 安全分区六行右侧的操作按钮, 名称各不相同, 方便按位置核对.
 */
const SECURITY_ENTRIES: SettingsSecurityEntries = {
  masterPasswordAction: <Button>主密码操作</Button>,
  recoveryKeyAction: <Button>恢复密钥操作</Button>,
  idleLockAction: <Button>空闲锁定操作</Button>,
  screenLockAction: <Button>锁屏锁定操作</Button>,
  sleepLockAction: <Button>休眠锁定操作</Button>,
  isAutoLockUnavailable: false,
  contentProtectionAction: <Button>内容保护操作</Button>,
};

/**
 * 渲染安全分区.
 * @param entries 各行右侧的操作元素.
 * @returns 偏好环境, 用来切换语言.
 */
async function renderSection(
  entries: SettingsSecurityEntries = SECURITY_ENTRIES,
): ReturnType<typeof createPreferencesTestEnvironment> {
  const environment = await createPreferencesTestEnvironment();
  render(<SettingsSecuritySection entries={entries} />, {
    wrapper: environment.Providers,
  });
  return environment;
}

describe("安全分区的内容保护行", () => {
  it("最后一行是内容保护, 有名称, 说明和操作", async () => {
    await renderSection();

    const text = screen.getByRole("region", { name: "安全" }).textContent ?? "";
    const expectedInOrder = [
      "休眠锁定操作",
      "内容保护",
      "开启后, 截屏, 录屏, 屏幕共享和远程协助软件看不到本窗口",
      "内容保护操作",
    ];
    const positions = expectedInOrder.reduce<number[]>((found, part) => {
      const [previous = -1] = found.slice(-1);
      return [...found, text.indexOf(part, previous + 1)];
    }, []);
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("自动锁定不可用 (没设主密码) 时内容保护行仍在, 原因说明在它之前", async () => {
    await renderSection({ ...SECURITY_ENTRIES, isAutoLockUnavailable: true });

    const section = screen.getByRole("region", { name: "安全" });
    const text = section.textContent ?? "";

    expect(within(section).getByText("内容保护操作")).toBeDefined();
    expect(text.indexOf("未设置主密码")).toBeLessThan(
      text.indexOf("内容保护操作"),
    );
  });

  it("英文界面下名称与说明都是英文", async () => {
    const environment = await renderSection();

    await act(() => environment.i18n.changeLanguage("en"));

    const section = within(screen.getByRole("region", { name: "Security" }));
    expect(section.getByText("Content protection")).toBeDefined();
    expect(
      section.getByText(/screenshot, screen recording, screen sharing/),
    ).toBeDefined();
  });
});
