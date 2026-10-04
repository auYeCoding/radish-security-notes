import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";

import { FORUM_ENTRY } from "@renderer/testing/entry-fixtures";
import { getEntryList } from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 备注是 Markdown 的条目.
 */
const NOTE_ENTRY: EntryDetail = {
  ...FORUM_ENTRY,
  id: "note",
  name: "笔记",
  notes: "# 备忘标题\n\n- 要点一\n- 要点二",
  notesFormat: "markdown",
};

/**
 * 在条目环境里渲染解锁后的工作区, 等条目读取完成.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: [NOTE_ENTRY, FORUM_ENTRY],
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 在列表里点选一个条目, 等右侧详情显示它的名称.
 * @param name 条目名称.
 */
async function selectByName(name: string): Promise<void> {
  const listItem = within(getEntryList()).getByRole("button", {
    name: new RegExp(name),
  });
  await userEvent.setup().click(listItem);
  await screen.findByRole("heading", { name });
}

/**
 * 取详情窗格里的字段列表, 列表窗格里也有列表项, 查找备注渲染结果时要限定在这里.
 * @returns 字段列表元素.
 */
function getDetailFields(): HTMLElement {
  return document.querySelector("dl") as HTMLElement;
}

/**
 * 取备注格式选择里的一个按钮.
 * @param name 按钮的名称, 即格式的名称.
 * @returns 格式按钮元素.
 */
function getFormatButton(name: string): HTMLElement {
  const group = screen.getByRole("group", { name: "备注格式" });
  return within(group).getByRole("button", { name });
}

describe("工作区里的 Markdown 备注", () => {
  it("选中 Markdown 备注的条目, 详情里渲染成标题与列表, 切到纯文本条目后原样显示", async () => {
    await renderWorkspace();

    await selectByName("笔记");
    expect(screen.getByRole("heading", { name: "备忘标题" })).toBeDefined();
    expect(within(getDetailFields()).getAllByRole("listitem")).toHaveLength(2);
    await selectByName("论坛");

    expect(screen.queryByRole("heading", { name: "备忘标题" })).toBeNull();
    expect(within(getDetailFields()).queryAllByRole("listitem")).toHaveLength(
      0,
    );
  });

  it("新建时选 Markdown 保存, 详情立即按 Markdown 渲染", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建条目" }));
    await user.click(await screen.findByRole("button", { name: "通用登录" }));
    await user.type(await screen.findByLabelText("名称"), "新备忘");
    await user.type(screen.getByLabelText("备注"), "## 新标题");
    await user.click(getFormatButton("Markdown"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByRole("heading", { name: "新标题", level: 2 }),
    ).toBeDefined();
  });

  it("编辑时把 Markdown 改回纯文本, 详情按原文显示, 重新编辑时仍是纯文本", async () => {
    await renderWorkspace();
    await selectByName("笔记");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "编辑条目" }));
    await user.click(await screen.findByRole("button", { name: "纯文本" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "备忘标题" })).toBeNull(),
    );
    expect(await screen.findByText(/# 备忘标题/)).toBeDefined();
    await user.click(screen.getByRole("button", { name: "编辑条目" }));
    await screen.findByRole("dialog", { name: "编辑条目" });
    expect(getFormatButton("纯文本").getAttribute("aria-pressed")).toBe("true");
  });
});
