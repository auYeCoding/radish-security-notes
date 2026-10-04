import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { entryFailed } from "@shared/entries/entry-result";
import { describe, expect, it } from "vitest";

import zh from "@shared/locales/zh.json";
import { PRESET_ENTRY_TYPES } from "@shared/entries/preset-entry-types";
import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import {
  queryCustomFieldGroups,
  renderOpenedNewEntryDialog,
  renderOpenedNewEntryForm,
} from "@renderer/testing/render-new-entry-dialog";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 渲染新建入口并点击它打开对话框, 停在类型选择.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
function renderDialog(
  options?: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  return renderOpenedNewEntryDialog(<NewEntryTrigger />, options);
}

/**
 * 渲染新建入口, 打开对话框并选通用登录.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
function renderLoginForm(
  options?: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  return renderOpenedNewEntryForm(<NewEntryTrigger />, "通用登录", options);
}

describe("NewEntryTrigger 类型选择", () => {
  it("第一步是类型选择, 按预设顺序列出全部类型, 还没有表单", async () => {
    await renderDialog();

    const names = screen
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((text) => Object.values(zh.entryTypes).includes(text ?? ""));

    expect(names).toEqual(PRESET_ENTRY_TYPES.map((t) => zh.entryTypes[t.key]));
    expect(screen.getByRole("dialog", { name: "选择条目类型" })).toBeDefined();
    expect(screen.queryByLabelText("名称")).toBeNull();
  });

  it("点选类型后进入该类型的表单, 返回按钮回到类型选择并丢弃已填内容", async () => {
    await renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "银行卡" }));
    await user.type(await screen.findByLabelText("名称"), "已填内容");
    await user.click(screen.getByRole("button", { name: "返回" }));
    await user.click(screen.getByRole("button", { name: "银行卡" }));

    expect(screen.getByLabelText("名称")).toHaveProperty("value", "");
  });

  it("关闭后再次打开又是类型选择", async () => {
    await renderLoginForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(screen.getByRole("button", { name: "新建条目" }));

    expect(
      await screen.findByRole("dialog", { name: "选择条目类型" }),
    ).toBeDefined();
  });
});

describe("NewEntryTrigger 通用登录表单", () => {
  it("带名称, 账号, 密码, 网址, 备注与添加字段按钮, 默认没有自定义字段行", async () => {
    await renderLoginForm();

    for (const label of ["名称", "账号", "密码", "网址", "备注"]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
    expect(screen.getByRole("button", { name: "添加字段" })).toBeDefined();
    expect(queryCustomFieldGroups()).toHaveLength(0);
  });

  it("字段按名称, 账号, 密码, 网址, 自定义字段, 备注的顺序排列", async () => {
    await renderLoginForm();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "添加字段" }));

    const labels = ["名称", "账号", "密码", "网址", "字段名", "字段值", "备注"];
    const order = labels.map((label) => screen.getByLabelText(label));

    for (let index = 1; index < order.length; index += 1) {
      const position = order[index - 1].compareDocumentPosition(order[index]);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

describe("NewEntryTrigger 校验", () => {
  it("名称为空时显示错误且不提交", async () => {
    const { entryBridge } = await renderLoginForm();

    await userEvent.setup().click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("请填写名称.")).toBeDefined();
    expect(entryBridge.create).not.toHaveBeenCalled();
  });

  it("名称超过上限时显示错误", async () => {
    const { entryBridge } = await renderLoginForm();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("名称"));
    await user.paste("n".repeat(101));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("名称最多 100 个字符.")).toBeDefined();
    expect(entryBridge.create).not.toHaveBeenCalled();
  });

  it("账号超过上限时在账号下方显示带字段名的错误", async () => {
    const { entryBridge } = await renderLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "n");
    await user.click(screen.getByLabelText("账号"));
    await user.paste("a".repeat(201));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("账号最多 200 个字符.")).toBeDefined();
    expect(entryBridge.create).not.toHaveBeenCalled();
  });
});

describe("NewEntryTrigger 保存", () => {
  it("填写后保存: 带着类型交给桥, 关闭对话框, 新条目被选中", async () => {
    const { entryBridge, entryStore } = await renderLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "新论坛");
    await user.type(screen.getByLabelText("账号"), "someone");
    await user.type(screen.getByLabelText("密码"), "s3cret");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith({
      type: "login",
      name: "新论坛",
      fields: { account: "someone", password: "s3cret", url: "" },
      notes: "",
      notesFormat: "plain",
      customFields: [],
      totp: "",
    });
    expect(entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: { name: "新论坛", type: "login" },
    });
  });

  it("只填名称也能保存, 类型字段都是空串", async () => {
    const { entryBridge } = await renderLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "只有名称");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith({
      type: "login",
      name: "只有名称",
      fields: { account: "", password: "", url: "" },
      notes: "",
      notesFormat: "plain",
      customFields: [],
      totp: "",
    });
  });
});

describe("NewEntryTrigger 保存失败", () => {
  it("保存失败时对话框保持打开并显示原因", async () => {
    await renderLoginForm({
      entryBridgeOverrides: {
        create: () => Promise.resolve(entryFailed("vault-locked")),
      },
    });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "论坛");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("保存失败. 请关闭应用后重试."),
    ).toBeDefined();
    expect(screen.getByRole("dialog", { name: "新建条目" })).toBeDefined();
  });
});
