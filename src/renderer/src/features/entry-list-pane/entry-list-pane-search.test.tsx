import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { folderViewOf } from "@shared/folders/folder-view";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  MAIL_ENTRY,
  WALLET_ENTRY,
} from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";

import { EntryListPane } from "./entry-list-pane";

/**
 * 在条目环境里读取条目后渲染列表窗格.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderPane(
  options: EntryTestEnvironmentOptions,
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment(options);
  await environment.entryStore.getState().load();
  render(<EntryListPane />, { wrapper: environment.Providers });
  return environment;
}

/**
 * 设置关键字并等主进程的搜索结果回来.
 * @param environment 条目环境.
 * @param query 搜索框里的关键字.
 * @returns 搜索结果放进 store 后兑现.
 */
async function searchFor(
  environment: EntryTestEnvironment,
  query: string,
): Promise<void> {
  const { entryStore } = environment;
  await act(async () => {
    entryStore.getState().setQuery(query);
    await entryStore.getState().search();
  });
}

/**
 * 取页面里全部高亮片段的文字.
 * @returns 高亮片段文字, 按文档顺序排列.
 */
function highlightedTexts(): string[] {
  return Array.from(document.querySelectorAll("mark")).map(
    (mark) => mark.textContent ?? "",
  );
}

describe("EntryListPane 搜索其它字段", () => {
  const entries = [WALLET_ENTRY, MAIL_ENTRY, BANK_ENTRY];

  it.each([
    ["wallet.example", "钱包", "命中: 网址"],
    ["备注第二行", "钱包", "命中: 备注"],
    ["取款码", "钱包", "命中: 自定义字段"],
    ["邮箱备注", "邮箱", "命中: 备注"],
  ])("关键字 %s 命中 %s, 列表项写 %s", async (query, name, hitLine) => {
    const environment = await renderPane({ entries });

    await searchFor(environment, query);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByText(name)).toBeDefined();
    expect(within(items[0]).getByText(hitLine)).toBeDefined();
  });

  it("自定义字段的值与隐藏字段的值搜不到", async () => {
    const environment = await renderPane({ entries });

    await searchFor(environment, "pin-1234");
    expect(screen.getByText("没有匹配的条目")).toBeDefined();

    await searchFor(environment, "seed-one");
    expect(screen.getByText("没有匹配的条目")).toBeDefined();
  });

  it("密码搜不到", async () => {
    const environment = await renderPane({ entries });

    await searchFor(environment, "wallet-password");

    expect(screen.getByText("没有匹配的条目")).toBeDefined();
  });

  it("标签名命中时写命中: 标签", async () => {
    const environment = await renderPane({
      entries: [{ ...FORUM_ENTRY, tagIds: ["tag-work"] }, BANK_ENTRY],
      tags: [{ id: "tag-work", name: "Project", color: "slate" }],
    });

    await searchFor(environment, "project");

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByText("命中: 标签")).toBeDefined();
  });

  it("只在名称或账号里命中时不写命中字段行", async () => {
    const environment = await renderPane({ entries });

    await searchFor(environment, "bank");

    expect(screen.queryByText(/^命中:/)).toBeNull();
  });
});

describe("EntryListPane 高亮", () => {
  it("名称与账号里命中的部分高亮", async () => {
    const environment = await renderPane({ entries: [BANK_ENTRY] });

    await searchFor(environment, "bank 银");

    expect(highlightedTexts()).toEqual(["银", "bank"]);
  });

  it("名称里的汉字可以用拼音首字母命中并高亮", async () => {
    const environment = await renderPane({ entries: [BANK_ENTRY] });

    await searchFor(environment, "yx");

    expect(highlightedTexts()).toEqual(["银行"]);
  });

  it("输入新关键字而新结果还没返回时, 高亮与结果保持上一次的样子", async () => {
    const environment = await renderPane({ entries: [BANK_ENTRY] });
    await searchFor(environment, "bank");

    act(() => environment.entryStore.getState().setQuery("bank-acc"));

    expect(highlightedTexts()).toEqual(["bank"]);
    await searchFor(environment, "bank-acc");
    expect(highlightedTexts()).toEqual(["bank-acc"]);
  });

  it("没有搜索时不渲染高亮", async () => {
    await renderPane({ entries: [BANK_ENTRY] });

    expect(highlightedTexts()).toEqual([]);
  });
});

describe("EntryListPane 无结果时的范围说明", () => {
  it("没有文件夹筛选时只有无匹配的说明", async () => {
    const environment = await renderPane({ entries: [BANK_ENTRY] });

    await searchFor(environment, "zzz");

    expect(screen.getByText("没有匹配的条目")).toBeDefined();
    expect(screen.queryByText("搜索只在当前筛选结果里进行")).toBeNull();
  });

  it("选了文件夹后补一句搜索只在当前筛选结果里进行", async () => {
    const environment = await renderPane({
      entries: [{ ...BANK_ENTRY, folderId: "work" }, FORUM_ENTRY],
      folders: [{ id: "work", name: "工作" }],
    });
    act(() =>
      environment.entryStore.getState().selectView(folderViewOf("work")),
    );

    await searchFor(environment, "forum");

    expect(screen.getByText("没有匹配的条目")).toBeDefined();
    expect(screen.getByText("搜索只在当前筛选结果里进行")).toBeDefined();
  });

  it("没有关键字时当前入口为空不提搜索范围", async () => {
    const environment = await renderPane({
      entries: [FORUM_ENTRY],
      folders: [{ id: "empty", name: "空" }],
    });

    act(() =>
      environment.entryStore.getState().selectView(folderViewOf("empty")),
    );

    expect(screen.getByText("这里还没有条目")).toBeDefined();
    expect(screen.queryByText("搜索只在当前筛选结果里进行")).toBeNull();
  });
});
