import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { getEntryListItems } from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [{ id: "home", name: "家庭" }];

/**
 * 论坛在家庭文件夹里, 带重要与工作标签; 银行在家庭文件夹里, 带工作标签; 维基未分类, 带个人标签.
 */
const ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "home", tagIds: ["important", "work-tag"] },
  { ...BANK_ENTRY, folderId: "home", tagIds: ["work-tag"] },
  { ...WIKI_ENTRY, tagIds: ["personal-tag"] },
];

/**
 * 在条目环境里渲染解锁后的工作区, 等条目, 文件夹与标签读取完成.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: ENTRIES,
    folders: FOLDERS,
    tags: TEST_TAGS,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.tagStore.getState().loadStatus).toBe("ready");
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 按名称与条目数取侧栏的一行入口按钮, 按钮的名称形如 "工作 2".
 * @param label 入口名称.
 * @param count 入口里的条目数.
 * @returns 入口按钮元素.
 */
function navButton(label: string, count: number): HTMLElement {
  return screen.getByRole("button", {
    name: new RegExp(`^${label}\\s*${count}$`),
  });
}

/**
 * 取列表里每个条目的名称.
 * @returns 名称数组, 按列表顺序.
 */
function listedNames(): string[] {
  return getEntryListItems().map((item) => item.textContent ?? "");
}

describe("点标签筛选", () => {
  it("点一个标签只显示带它的条目, 再点取消, 标签按钮标出按下状态", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    expect(getEntryListItems()).toHaveLength(3);

    await user.click(navButton("工作", 2));
    expect(getEntryListItems()).toHaveLength(2);
    expect(navButton("工作", 2).getAttribute("aria-pressed")).toBe("true");
    expect(navButton("重要", 1).getAttribute("aria-pressed")).toBe("false");

    await user.click(navButton("工作", 2));
    expect(getEntryListItems()).toHaveLength(3);
    expect(navButton("工作", 2).getAttribute("aria-pressed")).toBe("false");
  });

  it("可以同时选多个标签, 只显示同时带这些标签的条目", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(navButton("工作", 2));
    await user.click(navButton("重要", 1));

    const names = listedNames();
    expect(names).toHaveLength(1);
    expect(names[0]).toContain("论坛");
    expect(navButton("重要", 1).getAttribute("aria-pressed")).toBe("true");
    expect(navButton("工作", 2).getAttribute("aria-pressed")).toBe("true");
  });

  it("选了没有条目同时带的标签组合时显示这里还没有条目", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(navButton("重要", 1));
    await user.click(navButton("个人", 1));

    expect(getEntryListItems()).toHaveLength(0);
    expect(screen.getByText("这里还没有条目")).toBeDefined();
  });

  it("标签旁的条目数不随筛选变化", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(navButton("个人", 1));

    expect(navButton("工作", 2)).toBeDefined();
    expect(navButton("重要", 1)).toBeDefined();
  });
});

describe("标签筛选与文件夹, 搜索的组合", () => {
  it("标签与文件夹入口叠加取交集, 点文件夹不清已选标签", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(navButton("个人", 1));
    await user.click(navButton("家庭", 2));

    expect(getEntryListItems()).toHaveLength(0);
    expect(navButton("个人", 1).getAttribute("aria-pressed")).toBe("true");
    expect(navButton("家庭", 2).getAttribute("aria-current")).toBe("true");

    await user.click(navButton("未分类", 1));
    expect(listedNames()[0]).toContain("维基");
  });

  it("先选文件夹再选标签, 只显示该文件夹里带这个标签的条目", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(navButton("家庭", 2));
    await user.click(navButton("重要", 1));

    const names = listedNames();
    expect(names).toHaveLength(1);
    expect(names[0]).toContain("论坛");
  });

  it("搜索只在已选标签筛出的条目里进行", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(navButton("工作", 2));
    await user.type(screen.getByPlaceholderText("搜索名称或账号"), "bank");

    const names = listedNames();
    expect(names).toHaveLength(1);
    expect(names[0]).toContain("银行");

    await user.clear(screen.getByPlaceholderText("搜索名称或账号"));
    await user.type(screen.getByPlaceholderText("搜索名称或账号"), "wiki");
    expect(screen.getByText("没有匹配的条目")).toBeDefined();
  });
});

describe("标签筛选与选中的条目", () => {
  it("选中的条目不带新选的标签时详情回到空状态", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.click(
      getEntryListItems()[2]?.querySelector("button") as Element,
    );
    expect(await screen.findByRole("heading", { name: "维基" })).toBeDefined();

    await user.click(navButton("工作", 2));

    expect(screen.queryByRole("heading", { name: "维基" })).toBeNull();
    expect(screen.getByText("选择一个条目查看详情")).toBeDefined();
  });

  it("详情里显示选中条目带的标签徽章", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(
      getEntryListItems()[0]?.querySelector("button") as Element,
    );

    const badges = await screen.findByRole("list", { name: "标签" });
    expect(
      within(badges)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["重要", "工作"]);
  });
});
