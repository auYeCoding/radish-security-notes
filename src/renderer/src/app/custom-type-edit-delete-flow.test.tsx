import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { ROUTER_ENTRY } from "@renderer/testing/custom-type-fixtures";
import {
  getEntryList,
  getEntryListItems,
} from "@renderer/testing/entry-list-queries";
import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import { chooseTypeMenuItem } from "@renderer/testing/render-custom-type-edit-form";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 渲染解锁后的工作区, 里面有路由器类型与它名下的一个条目, 等列表读取完成, 再选中这个条目让详情
 * 显示出来.
 */
async function renderWorkspaceWithRouter(): Promise<void> {
  const environment = await createEntryTestEnvironment({
    customEntryTypes: [ROUTER_TYPE],
    entries: [ROUTER_ENTRY],
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => expect(getEntryListItems()).toHaveLength(1));
  await userEvent
    .setup()
    .click(within(getEntryList()).getByRole("button", { name: /家里路由器/ }));
  await screen.findByRole("heading", { name: "家里路由器" });
}

/**
 * 打开新建对话框, 经路由器类型格的菜单选一项.
 * @param itemName 菜单项名称.
 */
async function openTypeMenuItem(itemName: string): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "新建条目" }));
  await screen.findByRole("dialog", { name: "选择条目类型" });
  await chooseTypeMenuItem("路由器", itemName);
}

/**
 * 关闭新建对话框.
 */
async function closeDialog(): Promise<void> {
  await userEvent
    .setup()
    .click(await screen.findByRole("button", { name: "关闭" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

/**
 * 在编辑类型表单里点保存修改, 等回到类型选择后关闭对话框.
 */
async function saveEditAndClose(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "保存修改" }));
  await screen.findByRole("dialog", { name: "选择条目类型" });
  await closeDialog();
}

describe("工作区里改名后条目一侧跟上", () => {
  it("改类型名称后, 列表第二行与选中条目的详情都显示新类型名", async () => {
    await renderWorkspaceWithRouter();
    const user = userEvent.setup();

    await openTypeMenuItem("编辑类型");
    await user.clear(await screen.findByLabelText("类型名称"));
    await user.type(screen.getByLabelText("类型名称"), "家用路由器");
    await saveEditAndClose();

    expect(
      within(getEntryList()).getByText(/家用路由器 · 192\.168\.1\.1/),
    ).toBeDefined();
    expect(screen.getAllByText("家用路由器").length).toBeGreaterThan(0);
  });
});

describe("工作区里改摘要字段后条目一侧跟上", () => {
  it("取消列表摘要后, 列表第二行不再显示地址, 详情里地址仍在", async () => {
    await renderWorkspaceWithRouter();
    const user = userEvent.setup();

    await openTypeMenuItem("编辑类型");
    await user.click(
      await screen.findByRole("radio", { name: "不设列表摘要" }),
    );
    await saveEditAndClose();

    expect(within(getEntryList()).queryByText(/192\.168\.1\.1/)).toBeNull();
    expect(await screen.findByText("192.168.1.1")).toBeDefined();
  });
});

describe("工作区里删除字段后条目一侧跟上", () => {
  it("确认后选中条目的详情里不再有被删字段与它的取值", async () => {
    await renderWorkspaceWithRouter();
    const user = userEvent.setup();
    expect(await screen.findByText("口令")).toBeDefined();

    await openTypeMenuItem("编辑类型");
    await user.click(await screen.findByRole("button", { name: "删除字段 2" }));
    await user.click(screen.getByRole("button", { name: "保存修改" }));
    await user.click(await screen.findByRole("button", { name: "确认并保存" }));
    await screen.findByRole("dialog", { name: "选择条目类型" });
    await closeDialog();

    await waitFor(() => expect(screen.queryByText("口令")).toBeNull());
    expect(screen.getByText("192.168.1.1")).toBeDefined();
  });
});

describe("工作区里删除类型后条目一侧跟上", () => {
  it("确认删除后条目仍在列表里, 类型显示为安全笔记, 详情里字段取值成了自定义字段", async () => {
    await renderWorkspaceWithRouter();
    await openTypeMenuItem("删除类型");

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "删除类型" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await closeDialog();

    expect(getEntryListItems()).toHaveLength(1);
    expect(within(getEntryList()).getByText("安全笔记")).toBeDefined();
    expect(await screen.findByText("口令")).toBeDefined();
    expect(screen.getByText("192.168.1.1")).toBeDefined();
  });

  it("取消删除后条目与类型都不变", async () => {
    await renderWorkspaceWithRouter();
    await openTypeMenuItem("删除类型");

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    expect(screen.getByRole("button", { name: "路由器" })).toBeDefined();
    await closeDialog();
    expect(
      within(getEntryList()).getByText(/路由器 · 192\.168\.1\.1/),
    ).toBeDefined();
  });
});
