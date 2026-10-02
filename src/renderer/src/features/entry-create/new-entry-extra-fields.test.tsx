import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import {
  queryCustomFieldGroups,
  renderOpenedNewEntryForm,
} from "@renderer/testing/render-new-entry-dialog";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 渲染新建入口, 打开对话框并选通用登录.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
function renderDialog(
  options?: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  return renderOpenedNewEntryForm(<NewEntryTrigger />, "通用登录", options);
}

describe("新建表单 网址与备注", () => {
  it("填写网址与多行备注后保存, 换行原样交给桥", async () => {
    const { entryBridge, entryStore } = await renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "钱包");
    await user.type(
      screen.getByLabelText("网址"),
      "https://wallet.example.test",
    );
    await user.type(screen.getByLabelText("备注"), "第一行{Enter}第二行");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith({
      type: "login",
      name: "钱包",
      fields: { account: "", password: "", url: "https://wallet.example.test" },
      notes: "第一行\n第二行",
      customFields: [],
      totp: "",
    });
    expect(entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: {
        fields: { url: "https://wallet.example.test" },
        notes: "第一行\n第二行",
      },
    });
  });
});

describe("新建表单 自定义字段编辑", () => {
  it("删除一行后剩下的行重新编号并保留各自填写的内容", async () => {
    await renderDialog();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "添加字段" }));
    await user.click(screen.getByRole("button", { name: "添加字段" }));
    const rows = queryCustomFieldGroups();
    await user.type(within(rows[0]).getByLabelText("字段名"), "甲");
    await user.type(within(rows[1]).getByLabelText("字段名"), "乙");

    await user.click(screen.getByRole("button", { name: "删除字段 1" }));

    const remaining = queryCustomFieldGroups();
    expect(remaining).toHaveLength(1);
    expect(within(remaining[0]).getByLabelText("字段名")).toHaveProperty(
      "value",
      "乙",
    );
  });

  it("字段名为空时在该字段下显示错误且不提交", async () => {
    const { entryBridge } = await renderDialog();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("名称"), "钱包");
    await user.click(screen.getByRole("button", { name: "添加字段" }));
    await user.type(screen.getByLabelText("字段值"), "只有值");

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("请填写字段名.")).toBeDefined();
    expect(entryBridge.create).not.toHaveBeenCalled();
  });
});

describe("新建表单 自定义字段保存", () => {
  it("添加多个字段, 填写多行值并勾选隐藏后保存, 字段名去首尾空格", async () => {
    const { entryBridge } = await renderDialog();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("名称"), "钱包");

    await user.click(screen.getByRole("button", { name: "添加字段" }));
    await user.click(screen.getByRole("button", { name: "添加字段" }));
    const [first, second] = queryCustomFieldGroups().map((row) => within(row));
    await user.type(first.getByLabelText("字段名"), "  助记词  ");
    await user.type(first.getByLabelText("字段值"), "a b{Enter}c d");
    await user.click(first.getByRole("checkbox", { name: "隐藏" }));
    await user.type(second.getByLabelText("字段名"), "取款码");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith({
      type: "login",
      name: "钱包",
      fields: { account: "", password: "", url: "" },
      notes: "",
      customFields: [
        { label: "助记词", value: "a b\nc d", isHidden: true },
        { label: "取款码", value: "", isHidden: false },
      ],
      totp: "",
    });
  });
});

describe("新建表单 不限制数量与长度", () => {
  it("十几个字段与两万字符的字段值都能保存", async () => {
    const { entryBridge } = await renderDialog();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("名称"), "大条目");
    for (let count = 0; count < 12; count += 1) {
      await user.click(screen.getByRole("button", { name: "添加字段" }));
    }
    const rows = queryCustomFieldGroups();
    for (const row of rows) {
      await user.type(within(row).getByLabelText("字段名"), "f");
    }
    await user.click(within(rows[0]).getByLabelText("字段值"));
    await user.paste("v".repeat(20000));

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const request = vi.mocked(entryBridge.create).mock.calls[0][0];
    expect(request.customFields).toHaveLength(12);
    expect(request.customFields[0].value).toHaveLength(20000);
  });
});
