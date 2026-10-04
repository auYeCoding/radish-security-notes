import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import { getEntryListItems } from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 在条目环境里渲染解锁后的工作区, 等条目读取完成.
 * @param entries 假桥里的初始条目.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(
  entries = TEST_ENTRIES,
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({ entries });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 点击新建入口, 在类型选择里点选一个类型, 等该类型的表单出现.
 * @param typeName 要选的类型在界面上的名称.
 */
async function openFormOfType(typeName: string): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "新建条目" }));
  await user.click(await screen.findByRole("button", { name: typeName }));
  await screen.findByLabelText("名称");
}

describe("解锁后的工作区", () => {
  it("挂载时读取条目并列出, 搜索框已聚焦", async () => {
    await renderWorkspace();

    expect(getEntryListItems()).toHaveLength(3);
    expect(document.activeElement).toBe(
      screen.getByRole("searchbox", { name: "搜索" }),
    );
  });

  it("输入关键字, 选中, 复制三次操作内复制到密码", async () => {
    const { entryBridge } = await renderWorkspace();
    const user = userEvent.setup();

    await user.keyboard("bank");
    await waitFor(() => expect(getEntryListItems()).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: /银行/ }));
    await user.click(await screen.findByRole("button", { name: "复制 密码" }));

    expect(entryBridge.copyField).toHaveBeenCalledTimes(1);
    expect(entryBridge.copyField).toHaveBeenCalledWith("bank", "password");
    expect(screen.getByRole("button", { name: "复制 密码" }).textContent).toBe(
      "已复制",
    );
  });

  it("清空关键字后恢复全部条目", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.keyboard("bank");

    await user.clear(screen.getByRole("searchbox", { name: "搜索" }));

    expect(getEntryListItems()).toHaveLength(3);
  });
});

describe("工作区新建条目", () => {
  it("选通用登录并保存后, 新条目按名称排序规则出现在列表里, 右侧详情展示它并标明类型", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await openFormOfType("通用登录");
    await user.type(screen.getByLabelText("名称"), "新条目");
    await user.type(screen.getByLabelText("账号"), "new-account");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(getEntryListItems()).toHaveLength(4);
    expect(getEntryListItems()[3]?.textContent).toContain(
      "通用登录 · new-account",
    );
    expect(screen.getByRole("heading", { name: "新条目" })).toBeDefined();
  });
});

describe("工作区搜索中新建条目", () => {
  it("搜索中新建条目后清空关键字, 新条目出现在列表里", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.keyboard("bank");

    await openFormOfType("通用登录");
    await user.type(screen.getByLabelText("名称"), "全新");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(getEntryListItems()).toHaveLength(4);
  });
});

describe("工作区新建银行卡与含自定义字段的条目", () => {
  it("选银行卡保存后详情展示该类型的字段, 卡号默认遮罩, 复制不必先显示", async () => {
    const { entryBridge } = await renderWorkspace();
    const user = userEvent.setup();

    await openFormOfType("银行卡");
    await user.type(screen.getByLabelText("名称"), "工资卡");
    await user.type(screen.getByLabelText("持卡人"), "张三");
    await user.type(screen.getByLabelText("卡号"), "6222000011112222");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("heading", { name: "工资卡" })).toBeDefined();
    expect(screen.getByText("张三")).toBeDefined();
    expect(screen.queryByText("6222000011112222")).toBeNull();
    await user.click(screen.getByRole("button", { name: "复制 卡号" }));
    expect(entryBridge.copyField).toHaveBeenCalledWith(
      "created-4",
      "cardNumber",
    );
    expect(screen.queryByText("6222000011112222")).toBeNull();
    await user.click(screen.getByRole("button", { name: "显示 卡号" }));
    expect(screen.getByText("6222000011112222")).toBeDefined();
  });
});

describe("工作区新建含备注与自定义字段的条目", () => {
  it("保存后详情展示备注与自定义字段并可复制", async () => {
    const { entryBridge } = await renderWorkspace();
    const user = userEvent.setup();

    await openFormOfType("通用登录");
    await user.type(screen.getByLabelText("名称"), "钱包");
    await user.type(
      screen.getByLabelText("网址"),
      "https://wallet.example.test",
    );
    await user.type(screen.getByLabelText("备注"), "备注一{Enter}备注二");
    await user.click(screen.getByRole("button", { name: "添加字段" }));
    await user.type(screen.getByLabelText("字段名"), "助记词");
    await user.type(screen.getByLabelText("字段值"), "甲 乙{Enter}丙 丁");
    await user.click(screen.getByRole("checkbox", { name: "隐藏" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("heading", { name: "钱包" })).toBeDefined();
    expect(screen.getByText("https://wallet.example.test")).toBeDefined();
    expect(screen.getByText("备注一 备注二").textContent).toBe(
      "备注一\n备注二",
    );
    expect(screen.queryByText(/甲 乙/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "显示 助记词" }));
    expect(screen.getByText(/甲 乙/).textContent).toBe("甲 乙\n丙 丁");
    await user.click(screen.getByRole("button", { name: "复制 助记词" }));
    expect(entryBridge.copyCustomField).toHaveBeenCalledWith(
      "created-4",
      "created-field-1",
    );
  });
});
