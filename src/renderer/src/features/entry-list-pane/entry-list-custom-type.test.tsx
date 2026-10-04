import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { ROUTER_ENTRY } from "@renderer/testing/custom-type-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { EntryListPane } from "./entry-list-pane";

/**
 * 在带路由器类型的条目环境里读取条目后渲染列表窗格.
 * @returns 渲染所用的环境.
 */
async function renderRouterList(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: [ROUTER_ENTRY],
    customEntryTypes: [ROUTER_TYPE],
  });
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

describe("EntryListPane 自定义类型的条目", () => {
  it("第二行是自定义类型名加摘要字段的账号, 保密字段的值不在列表里", async () => {
    await renderRouterList();

    expect(screen.getByText("家里路由器")).toBeDefined();
    expect(screen.getByText(/路由器 · 192\.168\.1\.1/)).toBeDefined();
    expect(document.body.textContent).not.toContain("router-secret-pass");
  });

  it("搜非保密的多行字段命中, 列表项写自定义字段名", async () => {
    const environment = await renderRouterList();

    await searchFor(environment, "机房左侧");

    expect(screen.getByText("命中: 说明")).toBeDefined();
  });

  it("搜保密字段的值搜不到, 条目被过滤掉", async () => {
    const environment = await renderRouterList();

    await searchFor(environment, "router-secret-pass");

    expect(screen.queryByText("家里路由器")).toBeNull();
  });
});
