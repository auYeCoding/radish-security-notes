import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  isButtonDisabled,
  openEmailBackupDialogWith,
} from "@renderer/testing/open-email-backup-dialog";

import { EmailBackupTrigger } from "./email-backup-trigger";

/**
 * 渲染邮箱备份入口并点开对话框.
 * @returns 打开之后兑现.
 */
async function openDialog(): Promise<void> {
  await openEmailBackupDialogWith(() => <EmailBackupTrigger />);
}

/**
 * 在邮箱类型下拉里选一个类型.
 * @param name 类型的显示名称.
 * @returns 选择完成后兑现.
 */
async function chooseProvider(name: string): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "邮箱类型" }));
  await user.click(await screen.findByRole("option", { name }));
}

/**
 * 单封邮件上限输入框的内容.
 * @returns 输入框里的文本.
 */
function sizeLimitValue(): string {
  return (screen.getByLabelText("单封邮件上限 (MB)") as HTMLInputElement).value;
}

describe("邮箱备份对话框: 预置邮箱类型", () => {
  it("换预置类型时单封上限换成这种邮箱的预置值, 不显示服务器字段", async () => {
    await openDialog();
    expect(sizeLimitValue()).toBe("50");

    await chooseProvider("163 邮箱");

    expect(sizeLimitValue()).toBe("15");
    expect(screen.queryByLabelText("SMTP 服务器")).toBeNull();
    expect(screen.getByText(/以邮箱厂商当前规定为准/)).toBeDefined();
  });

  it("选 Outlook 时给出明确提示, 保存按钮不可点", async () => {
    await openDialog();
    await userEvent
      .setup()
      .type(screen.getByLabelText("邮箱地址"), "a@outlook.com");

    await chooseProvider("Outlook");

    expect(screen.getByText("暂不支持 Outlook 个人账户")).toBeDefined();
    expect(screen.getByText(/OAuth2/)).toBeDefined();
    expect(isButtonDisabled("保存设置")).toBe(true);
  });
});

describe("邮箱备份对话框: 自定义 SMTP", () => {
  it("选自定义后出现服务器, 端口与加密连接, 单封上限取自定义的默认值", async () => {
    await openDialog();

    await chooseProvider("自定义 SMTP");

    expect(screen.getByLabelText("SMTP 服务器")).toBeDefined();
    expect(screen.getByLabelText("端口")).toBeDefined();
    expect(screen.getByRole("combobox", { name: "加密连接" })).toBeDefined();
    expect(sizeLimitValue()).toBe("10");
  });

  it("端口超出范围时提示, 服务器地址格式不对时提示", async () => {
    await openDialog();
    await chooseProvider("自定义 SMTP");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("SMTP 服务器"), "-bad");
    await user.clear(screen.getByLabelText("端口"));
    await user.type(screen.getByLabelText("端口"), "70000");

    expect(screen.getAllByText("格式不正确.").length).toBeGreaterThan(0);
    expect(screen.getByText("超出允许的范围.")).toBeDefined();
  });

  it("可以选 STARTTLS 加密连接", async () => {
    await openDialog();
    await chooseProvider("自定义 SMTP");
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "加密连接" }));
    await user.click(
      await screen.findByRole("option", { name: "STARTTLS (升级为加密)" }),
    );

    expect(
      screen.getByRole("combobox", { name: "加密连接" }).textContent,
    ).toContain("STARTTLS");
  });
});
