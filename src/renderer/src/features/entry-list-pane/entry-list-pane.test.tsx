import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { entryFailed } from "@shared/entries/entry-result";
import { BANK_CARD_TYPE } from "@shared/entries/preset-types/bank-card-type";
import { SERVER_TYPE } from "@shared/entries/preset-types/server-type";
import { describe, expect, it } from "vitest";

import { sampleEntryOf, TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironmentOptions,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { EntryListPane } from "./entry-list-pane";

/**
 * 在条目环境里读取条目后渲染列表窗格.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderPane(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment(options);
  await environment.entryStore.getState().load();
  render(<EntryListPane headerAction={<span>操作插槽</span>} />, {
    wrapper: environment.Providers,
  });
  return environment;
}

describe("EntryListPane 展示", () => {
  it("每项显示名称与账号, 标题行显示数量与操作插槽", async () => {
    await renderPane({ entries: TEST_ENTRIES });

    expect(
      screen.getByRole("button", { name: /论坛.*forum-account/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /银行.*bank-account/ }),
    ).toBeDefined();
    expect(screen.getByText("共 3 个条目")).toBeDefined();
    expect(screen.getByText("操作插槽")).toBeDefined();
  });

  it("第二行是 类型名 · 账号, 没有账号字段的类型只显示类型名", async () => {
    await renderPane({
      entries: [sampleEntryOf(BANK_CARD_TYPE), sampleEntryOf(SERVER_TYPE)],
    });

    expect(screen.getByText("银行卡")).toBeDefined();
    expect(screen.getByText("服务器 · server-account")).toBeDefined();
  });

  it("没有条目时显示空状态", async () => {
    await renderPane();

    expect(screen.getByText("还没有条目")).toBeDefined();
    expect(screen.getByText("共 0 个条目")).toBeDefined();
  });

  it("读取失败时说明原因", async () => {
    await renderPane({
      entryBridgeOverrides: {
        list: () => Promise.resolve(entryFailed("vault-locked")),
      },
    });

    expect(screen.getByText(/无法读取条目/)).toBeDefined();
  });
});

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

describe("EntryListPane 过滤", () => {
  it("关键字匹配名称或账号, 数量随之变化, 清空后恢复全部", async () => {
    const environment = await renderPane({ entries: TEST_ENTRIES });

    await searchFor(environment, "bank");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("共 1 个条目")).toBeDefined();

    await searchFor(environment, "维基");
    expect(screen.getByRole("button", { name: /维基/ })).toBeDefined();

    await searchFor(environment, "");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("没有匹配时显示无匹配的说明, 而不是还没有条目", async () => {
    const environment = await renderPane({ entries: TEST_ENTRIES });

    await searchFor(environment, "zzz");

    expect(screen.getByText("没有匹配的条目")).toBeDefined();
    expect(screen.queryByText("还没有条目")).toBeNull();
  });
});

describe("EntryListPane 选中", () => {
  it("点击一项读取它的详情并标为当前项", async () => {
    const { entryBridge } = await renderPane({ entries: TEST_ENTRIES });

    await userEvent.setup().click(screen.getByRole("button", { name: /银行/ }));

    expect(entryBridge.get).toHaveBeenCalledWith("bank");
    expect(
      screen.getByRole("button", { name: /银行/ }).getAttribute("aria-current"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: /论坛/ }).getAttribute("aria-current"),
    ).toBeNull();
  });
});
