import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { entryFailed } from "@shared/entries/entry-result";
import { describe, expect, it } from "vitest";

import type {
  EntryTestEnvironment,
  EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import {
  queryCustomFieldGroups,
  renderOpenedNewEntryDialog,
} from "@renderer/testing/render-new-entry-dialog";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 渲染新建入口并点击它打开对话框.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
function renderDialog(
  options?: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  return renderOpenedNewEntryDialog(<NewEntryTrigger />, options);
}

describe("NewEntryTrigger 对话框", () => {
  it("点击入口打开带名称, 账号, 密码, 网址, 备注与添加字段按钮的对话框, 默认没有自定义字段行", async () => {
    await renderDialog();

    expect(screen.getByRole("dialog", { name: "新建条目" })).toBeDefined();
    for (const label of ["名称", "账号", "密码", "网址", "备注"]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
    expect(screen.getByRole("button", { name: "添加字段" })).toBeDefined();
    expect(queryCustomFieldGroups()).toHaveLength(0);
  });

  it("字段按名称, 账号, 密码, 网址, 自定义字段, 备注的顺序排列", async () => {
    await renderDialog();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "添加字段" }));

    const order = [
      "名称",
      "账号",
      "密码",
      "网址",
      "字段名",
      "字段值",
      "备注",
    ].map((label) => screen.getByLabelText(label));

    for (let index = 1; index < order.length; index += 1) {
      const position = order[index - 1].compareDocumentPosition(order[index]);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("点击取消关闭对话框", async () => {
    await renderDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("NewEntryTrigger 校验", () => {
  it("名称为空时显示错误且不提交", async () => {
    const { entryBridge } = await renderDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("请填写名称.")).toBeDefined();
    expect(entryBridge.create).not.toHaveBeenCalled();
  });

  it("名称超过上限时显示错误", async () => {
    const { entryBridge } = await renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("名称"));
    await user.paste("n".repeat(101));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("名称最多 100 个字符.")).toBeDefined();
    expect(entryBridge.create).not.toHaveBeenCalled();
  });
});

describe("NewEntryTrigger 保存", () => {
  it("填写三项后保存: 交给桥, 关闭对话框, 新条目被选中", async () => {
    const { entryBridge, entryStore } = await renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "新论坛");
    await user.type(screen.getByLabelText("账号"), "someone");
    await user.type(screen.getByLabelText("密码"), "s3cret");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith({
      name: "新论坛",
      account: "someone",
      password: "s3cret",
      url: "",
      notes: "",
      customFields: [],
    });
    expect(entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: { name: "新论坛" },
    });
  });

  it("只填名称也能保存", async () => {
    const { entryBridge } = await renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "只有名称");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith({
      name: "只有名称",
      account: "",
      password: "",
      url: "",
      notes: "",
      customFields: [],
    });
  });
});

describe("NewEntryTrigger 保存失败", () => {
  it("保存失败时对话框保持打开并显示原因", async () => {
    await renderDialog({
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
