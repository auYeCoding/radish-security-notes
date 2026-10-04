import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { SearchBar } from "./search-bar";

/**
 * 在条目环境里渲染搜索栏.
 * @returns 渲染所用的环境.
 */
async function renderBar(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment();
  render(<SearchBar />, { wrapper: environment.Providers });
  return environment;
}

describe("SearchBar 聚焦", () => {
  it("挂载后搜索框已聚焦", async () => {
    await renderBar();

    expect(document.activeElement).toBe(
      screen.getByRole("searchbox", { name: "搜索" }),
    );
  });

  it("占位文案是搜索条目, 不再限定为名称或账号", async () => {
    await renderBar();

    expect(screen.getByPlaceholderText("搜索条目")).toBeDefined();
    expect(screen.queryByPlaceholderText("搜索名称或账号")).toBeNull();
  });
});

describe("SearchBar 即时过滤", () => {
  it("输入的关键字即时写入条目 store", async () => {
    const { entryStore } = await renderBar();
    const user = userEvent.setup();

    await user.keyboard("bank");

    expect(entryStore.getState().query).toBe("bank");
  });

  it("清空输入后关键字恢复为空", async () => {
    const { entryStore } = await renderBar();
    const user = userEvent.setup();
    await user.keyboard("bank");

    await user.clear(screen.getByRole("searchbox", { name: "搜索" }));

    expect(entryStore.getState().query).toBe("");
  });

  it("store 里的关键字变化时输入框随之更新", async () => {
    const { entryStore } = await renderBar();

    act(() => {
      entryStore.getState().setQuery("from-store");
    });

    expect(
      (screen.getByRole("searchbox", { name: "搜索" }) as HTMLInputElement)
        .value,
    ).toBe("from-store");
  });
});
