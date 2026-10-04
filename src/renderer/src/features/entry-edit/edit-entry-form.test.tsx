import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MAIL_ENTRY, WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import { renderOpenedEditEntryDialog } from "@renderer/testing/render-edit-entry-dialog";
import { queryCustomFieldGroups } from "@renderer/testing/render-new-entry-dialog";

import { EditEntryTrigger } from "./edit-entry-trigger";

/**
 * 渲染编辑入口, 打开钱包条目的编辑对话框.
 * @returns 渲染所用的环境.
 */
function openWalletDialog(): ReturnType<typeof renderOpenedEditEntryDialog> {
  return renderOpenedEditEntryDialog(
    (detail) => <EditEntryTrigger detail={detail} />,
    WALLET_ENTRY,
  );
}

/**
 * 取一个文本输入框.
 * @param label 输入框的标签.
 * @returns 输入框元素.
 */
function getInput(label: string): HTMLInputElement | HTMLTextAreaElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

describe("编辑表单预填现值", () => {
  it("名称, 类型字段, 备注与自定义字段都预填条目的现值, 类型只作标签显示", async () => {
    await openWalletDialog();

    const dialog = screen.getByRole("dialog", { name: "编辑条目" });
    expect(getInput("名称").value).toBe("钱包");
    expect(getInput("账号").value).toBe("wallet-account");
    expect(getInput("网址").value).toBe("https://wallet.example.test/login");
    expect(getInput("备注").value).toBe("备注第一行\n备注第二行");
    expect(within(dialog).getByText("通用登录")).toBeDefined();
    expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
  });

  it("密码预填现值并默认遮罩, 点显示后是明文", async () => {
    await openWalletDialog();
    const user = userEvent.setup();

    expect(getInput("密码").type).toBe("password");
    expect(getInput("密码").value).toBe("wallet-password");
    await user.click(screen.getByRole("button", { name: "显示 密码" }));

    expect(getInput("密码").type).toBe("text");
  });

  it("每个自定义字段一行, 字段名, 字段值与隐藏勾选都是现值", async () => {
    await openWalletDialog();

    const groups = queryCustomFieldGroups();
    expect(groups).toHaveLength(3);
    const seed = groups[1] as HTMLElement;
    expect(
      (within(seed).getByLabelText("字段名") as HTMLInputElement).value,
    ).toBe("助记词");
    expect(
      (within(seed).getByLabelText("字段值") as HTMLTextAreaElement).value,
    ).toBe("seed-one seed-two\nseed-three seed-four");
    expect(
      within(seed)
        .getByRole("checkbox", { name: "隐藏" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
});

describe("编辑表单保存", () => {
  it("不改动直接保存, 现值原样交给桥, TOTP 留空并且不移除", async () => {
    const { entryBridge } = await openWalletDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledWith("wallet", {
      name: "钱包",
      fields: WALLET_ENTRY.fields,
      notes: WALLET_ENTRY.notes,
      notesFormat: WALLET_ENTRY.notesFormat,
      customFields: WALLET_ENTRY.customFields.map(
        ({ label, value, isHidden }) => ({ label, value, isHidden }),
      ),
      totp: "",
      removeTotp: false,
    });
  });

  it("改名称, 账号, 备注与自定义字段后保存, 列表与详情立即更新", async () => {
    const { entryBridge, entryStore } = await openWalletDialog();
    const user = userEvent.setup();

    await user.clear(getInput("名称"));
    await user.type(getInput("名称"), "新钱包");
    await user.clear(getInput("账号"));
    await user.type(getInput("账号"), "new-account");
    await user.clear(getInput("备注"));
    await user.type(getInput("备注"), "新备注");
    await user.click(screen.getByRole("button", { name: "删除字段 1" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledTimes(1);
    expect(entryStore.getState().entries[0]).toEqual({
      id: "wallet",
      name: "新钱包",
      type: "login",
      account: "new-account",
    });
    expect(entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: { name: "新钱包", notes: "新备注" },
    });
    expect(entryStore.getState().detailRevision).toBe(1);
  });
});

describe("编辑表单校验与失败", () => {
  it("名称为空时给出提示, 不保存", async () => {
    const { entryBridge } = await openWalletDialog();
    const user = userEvent.setup();

    await user.clear(getInput("名称"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("请填写名称.")).toBeDefined();
    expect(entryBridge.update).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "编辑条目" })).toBeDefined();
  });

  it("自定义字段名为空时给出提示, 不保存", async () => {
    const { entryBridge } = await openWalletDialog();
    const user = userEvent.setup();

    await user.clear(
      within(queryCustomFieldGroups()[0] as HTMLElement).getByLabelText(
        "字段名",
      ),
    );
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("请填写字段名.")).toBeDefined();
    expect(entryBridge.update).not.toHaveBeenCalled();
  });

  it("类型字段超长时给出提示, 不保存", async () => {
    const { entryBridge } = await openWalletDialog();
    const user = userEvent.setup();

    await user.clear(getInput("账号"));
    await user.click(getInput("账号"));
    await user.paste("a".repeat(201));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("账号最多 200 个字符.")).toBeDefined();
    expect(entryBridge.update).not.toHaveBeenCalled();
  });

  it("没有 TOTP 的条目只显示添加 TOTP 的输入框, 不显示移除勾选", async () => {
    await openWalletDialog();

    expect(screen.getByText(/粘贴 Base32 密钥或 otpauth 链接/)).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: "移除 TOTP" })).toBeNull();
  });

  it("MAIL 条目带 TOTP 时, 提示已设置并且留空保持不变", async () => {
    await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      MAIL_ENTRY,
    );

    expect(screen.getByText(/这个条目已设置 TOTP/)).toBeDefined();
    expect(screen.getByRole("checkbox", { name: "移除 TOTP" })).toBeDefined();
  });
});
