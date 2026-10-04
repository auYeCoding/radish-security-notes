import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SEARCH_DEBOUNCE_MILLISECONDS } from "@shared/search/search-timing";

import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { useEntrySearchTrigger } from "./use-entry-search-trigger";

/**
 * 创建条目环境并挂载搜索触发器.
 * @returns 条目环境.
 */
async function mountTrigger(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: TEST_ENTRIES,
  });
  await environment.entryStore.getState().load();
  renderHook(() => useEntrySearchTrigger(), {
    wrapper: environment.Providers,
  });
  return environment;
}

/**
 * 让假定时器前进, 并等待由此触发的异步搜索完成.
 * @param milliseconds 前进的毫秒数.
 * @returns 完成后兑现.
 */
async function advance(milliseconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

/**
 * 在当前测试分组中登记钩子: 每个测试前启用假定时器, 测试后恢复真实定时器.
 */
function useFakeClock(): void {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
}

describe("useEntrySearchTrigger 防抖", () => {
  useFakeClock();

  it("关键字变化后停止输入防抖时长才搜索", async () => {
    const { entryStore, entryBridge } = await mountTrigger();
    vi.mocked(entryBridge.search).mockClear();

    act(() => entryStore.getState().setQuery("bank"));
    await advance(SEARCH_DEBOUNCE_MILLISECONDS - 1);
    expect(entryBridge.search).not.toHaveBeenCalled();

    await advance(1);
    expect(entryBridge.search).toHaveBeenCalledTimes(1);
    expect(entryBridge.search).toHaveBeenCalledWith("bank");
    expect(
      Array.from(entryStore.getState().searchMatches?.keys() ?? []),
    ).toEqual(["bank"]);
  });

  it("连续输入时只搜最后一次", async () => {
    const { entryStore, entryBridge } = await mountTrigger();
    vi.mocked(entryBridge.search).mockClear();

    act(() => entryStore.getState().setQuery("b"));
    await advance(SEARCH_DEBOUNCE_MILLISECONDS - 10);
    act(() => entryStore.getState().setQuery("ba"));
    await advance(SEARCH_DEBOUNCE_MILLISECONDS - 10);
    act(() => entryStore.getState().setQuery("bank"));
    await advance(SEARCH_DEBOUNCE_MILLISECONDS);

    expect(entryBridge.search).toHaveBeenCalledTimes(1);
    expect(entryBridge.search).toHaveBeenCalledWith("bank");
  });
});

describe("useEntrySearchTrigger 取消与重搜", () => {
  useFakeClock();

  it("关键字清空时不调用接口, 等待中的搜索被取消", async () => {
    const { entryStore, entryBridge } = await mountTrigger();
    vi.mocked(entryBridge.search).mockClear();

    act(() => entryStore.getState().setQuery("bank"));
    await advance(SEARCH_DEBOUNCE_MILLISECONDS - 10);
    act(() => entryStore.getState().setQuery(""));
    await advance(SEARCH_DEBOUNCE_MILLISECONDS * 2);

    expect(entryBridge.search).not.toHaveBeenCalled();
    expect(entryStore.getState().searchMatches).toBeUndefined();
  });

  it("条目列表变化时不等防抖立即重新搜索", async () => {
    const { entryStore, entryBridge } = await mountTrigger();
    act(() => entryStore.getState().setQuery("bank"));
    await advance(SEARCH_DEBOUNCE_MILLISECONDS);
    vi.mocked(entryBridge.search).mockClear();

    await act(async () => {
      await entryStore.getState().load();
    });

    expect(entryBridge.search).toHaveBeenCalledTimes(1);
    expect(entryBridge.search).toHaveBeenCalledWith("bank");
  });
});
