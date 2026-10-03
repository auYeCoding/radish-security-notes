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
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 工作文件夹与家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "work", name: "工作" },
  { id: "home", name: "家庭" },
];

/**
 * 论坛与银行在工作文件夹里, 维基未分类.
 */
const FILED_ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "work" },
  { ...BANK_ENTRY, folderId: "work" },
  WIKI_ENTRY,
];

/**
 * 在条目环境里渲染解锁后的工作区, 等条目与文件夹读取完成.
 * @param options 条目环境的选项, 默认带两个文件夹与三个条目.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: FILED_ENTRIES,
    folders: FOLDERS,
    ...options,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
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
 * 取列表窗格里每个条目项的名称.
 * @returns 条目名称列表.
 */
function listedNames(): string[] {
  return getEntryListItems().map(
    (item) => within(item).getAllByText(/\S/)[0]?.textContent ?? "",
  );
}

describe("侧栏文件夹列表", () => {
  it("固定入口在前, 其后是自建文件夹, 每行显示条目数, 默认选中全部条目", async () => {
    await renderWorkspace();

    expect(navButton("全部条目", 3).getAttribute("aria-current")).toBe("true");
    expect(navButton("未分类", 1).getAttribute("aria-current")).toBeNull();
    expect(navButton("工作", 2)).toBeDefined();
    expect(navButton("家庭", 0)).toBeDefined();
    expect(screen.queryByText("还没有文件夹")).toBeNull();
  });

  it("没有自建文件夹时说明还没有文件夹, 固定入口仍在", async () => {
    await renderWorkspace({ folders: [], entries: [] });

    expect(screen.getByText("还没有文件夹")).toBeDefined();
    expect(navButton("全部条目", 0)).toBeDefined();
    expect(navButton("未分类", 0)).toBeDefined();
  });

  it("读取文件夹失败时说明原因", async () => {
    const environment = await createEntryTestEnvironment({
      folderBridgeOverrides: {
        list: () => Promise.resolve({ ok: false, reason: "vault-locked" }),
      },
    });
    render(<UnlockedWorkspace />, { wrapper: environment.Providers });

    expect(
      await screen.findByText("无法读取文件夹. 请关闭应用后重试."),
    ).toBeDefined();
  });

  it("条目可以拖拽, 读屏软件读出的角色是可拖动的条目", async () => {
    await renderWorkspace();

    const first = getEntryListItems()[0];

    expect(
      first
        ?.querySelector("[aria-roledescription]")
        ?.getAttribute("aria-roledescription"),
    ).toBe("可拖动的条目");
  });
});

describe("点文件夹筛选条目", () => {
  it("点文件夹只显示其中的条目, 点未分类只显示未分类的, 点全部条目恢复", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(navButton("工作", 2));
    expect(listedNames()).toEqual(["论坛", "银行"]);
    expect(navButton("工作", 2).getAttribute("aria-current")).toBe("true");
    await user.click(navButton("未分类", 1));
    expect(listedNames()).toEqual(["维基"]);
    await user.click(navButton("家庭", 0));
    expect(screen.getByText("这里还没有条目")).toBeDefined();
    await user.click(navButton("全部条目", 3));

    expect(listedNames()).toEqual(["论坛", "银行", "维基"]);
  });

  it("搜索只在当前文件夹里进行, 回到全部条目后搜得到别处的条目", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.click(navButton("工作", 2));

    await user.type(screen.getByRole("searchbox", { name: "搜索" }), "维基");
    expect(screen.getByText("没有匹配的条目")).toBeDefined();
    await user.click(navButton("全部条目", 3));

    expect(listedNames()).toEqual(["维基"]);
  });

  it("选中的条目不属于新入口时, 详情回到空状态", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.click(
      within(getEntryListItems()[2] as HTMLElement).getByRole("button"),
    );
    await screen.findByRole("heading", { name: "维基" });

    await user.click(navButton("工作", 2));

    expect(screen.queryByRole("heading", { name: "维基" })).toBeNull();
    expect(screen.getByText("选择一个条目查看详情")).toBeDefined();
  });

  it("详情标明所属文件夹, 未分类的条目标明未分类", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(
      within(getEntryListItems()[0] as HTMLElement).getByRole("button"),
    );
    expect(await screen.findByText("文件夹: 工作")).toBeDefined();
    await user.click(
      within(getEntryListItems()[2] as HTMLElement).getByRole("button"),
    );

    expect(await screen.findByRole("heading", { name: "维基" })).toBeDefined();
    expect(screen.queryByText("文件夹: 工作")).toBeNull();
    expect(screen.getByText("未分类", { selector: "p" })).toBeDefined();
  });
});
