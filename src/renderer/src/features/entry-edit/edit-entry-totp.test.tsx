import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MAIL_ENTRY, WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import { renderOpenedEditEntryDialog } from "@renderer/testing/render-edit-entry-dialog";

import { EditEntryTrigger } from "./edit-entry-trigger";

/**
 * 渲染编辑入口, 打开一个条目的编辑对话框.
 * @param detail 要编辑的条目详情.
 * @returns 渲染所用的环境.
 */
function openDialogOf(
  detail: typeof MAIL_ENTRY,
): ReturnType<typeof renderOpenedEditEntryDialog> {
  return renderOpenedEditEntryDialog(
    (current) => <EditEntryTrigger detail={current} />,
    detail,
  );
}

/**
 * 取 TOTP 输入框.
 * @returns 输入框元素.
 */
function getTotpInput(): HTMLInputElement {
  return screen.getByLabelText("TOTP 密钥或链接", {
    selector: "input",
  }) as HTMLInputElement;
}

describe("编辑表单 TOTP: 带 TOTP 的条目", () => {
  it("输入框不回填密钥, 留空保存表示保持不变", async () => {
    const { entryBridge } = await openDialogOf(MAIL_ENTRY);
    const user = userEvent.setup();

    expect(getTotpInput().value).toBe("");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledWith(
      "mail",
      expect.objectContaining({ totp: "", removeTotp: false }),
    );
  });

  it("填入新密钥后保存, 新密钥原样交给桥", async () => {
    const { entryBridge } = await openDialogOf(MAIL_ENTRY);
    const user = userEvent.setup();

    await user.type(getTotpInput(), "GEZDGNBVGY3TQOJQ");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledWith(
      "mail",
      expect.objectContaining({ totp: "GEZDGNBVGY3TQOJQ", removeTotp: false }),
    );
  });

  it("新输入不合法时给出提示, 不保存", async () => {
    const { entryBridge } = await openDialogOf(MAIL_ENTRY);
    const user = userEvent.setup();

    await user.type(getTotpInput(), "not base32!");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("TOTP 密钥或链接不合法. 请检查后重试."),
    ).toBeDefined();
    expect(entryBridge.update).not.toHaveBeenCalled();
  });
});

describe("编辑表单 TOTP: 移除与添加", () => {
  it("勾选移除后输入框清空并禁用, 保存时要求移除", async () => {
    const { entryBridge, entryStore } = await openDialogOf(MAIL_ENTRY);
    const user = userEvent.setup();

    await user.type(getTotpInput(), "GEZDGNBVGY3TQOJQ");
    await user.click(screen.getByRole("checkbox", { name: "移除 TOTP" }));
    expect(getTotpInput().value).toBe("");
    expect(getTotpInput().disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledWith(
      "mail",
      expect.objectContaining({ totp: "", removeTotp: true }),
    );
    expect(entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: { hasTotp: false },
    });
  });

  it("取消勾选后输入框恢复可用", async () => {
    await openDialogOf(MAIL_ENTRY);
    const user = userEvent.setup();
    const checkbox = screen.getByRole("checkbox", { name: "移除 TOTP" });

    await user.click(checkbox);
    await user.click(checkbox);

    expect(getTotpInput().disabled).toBe(false);
  });

  it("本来不带 TOTP 的条目填入密钥保存即添加", async () => {
    const { entryBridge, entryStore } = await openDialogOf(WALLET_ENTRY);
    const user = userEvent.setup();

    await user.type(getTotpInput(), "GEZDGNBVGY3TQOJQ");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledWith(
      "wallet",
      expect.objectContaining({ totp: "GEZDGNBVGY3TQOJQ", removeTotp: false }),
    );
    expect(entryStore.getState().selection).toMatchObject({
      detail: { hasTotp: true },
    });
  });
});
