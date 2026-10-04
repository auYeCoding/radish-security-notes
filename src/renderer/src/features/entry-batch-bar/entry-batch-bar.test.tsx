import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  checkedIdsOf,
  checkEntries,
  renderWithLoadedStores,
} from "@renderer/testing/batch-test-helpers";
import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import type { EntryTestEnvironment } from "@renderer/testing/entry-test-environment";

import { EntryBatchBar } from "./entry-batch-bar";

/**
 * 渲染带三个条目的选择栏, 条目已读取, 栏里没有条目行, 勾选直接写进批量选中 store.
 * @param entries 条目, 默认是三个测试条目.
 * @returns 渲染所用的环境.
 */
function renderBar(
  entries: typeof TEST_ENTRIES = TEST_ENTRIES,
): Promise<EntryTestEnvironment> {
  return renderWithLoadedStores(<EntryBatchBar />, { entries });
}

/**
 * 取选择栏里的全选框.
 * @returns 全选框元素.
 */
function selectAllCheckbox(): HTMLElement {
  return screen.getByRole("checkbox", { name: "全选" });
}

describe("EntryBatchBar 全选", () => {
  it("没有勾选时显示 全选, 没有批量操作按钮", async () => {
    await renderBar();

    expect(screen.getByText("全选")).toBeDefined();
    expect(screen.queryByRole("button", { name: "删除选中的条目" })).toBeNull();
    expect(selectAllCheckbox().getAttribute("aria-checked")).toBe("false");
  });

  it("点全选勾选全部可见条目并显示数量, 再点取消全部勾选", async () => {
    const environment = await renderBar();
    const user = userEvent.setup();

    await user.click(selectAllCheckbox());
    expect(checkedIdsOf(environment)).toEqual(["bank", "forum", "wiki"]);
    expect(screen.getByText("已选 3 项")).toBeDefined();
    expect(selectAllCheckbox().getAttribute("aria-checked")).toBe("true");

    await user.click(selectAllCheckbox());
    expect(checkedIdsOf(environment)).toEqual([]);
    expect(screen.getByText("全选")).toBeDefined();
  });

  it("部分勾选时全选框是半选, 批量操作按钮出现", async () => {
    const environment = await renderBar();

    checkEntries(environment, ["forum"]);

    expect(selectAllCheckbox().getAttribute("aria-checked")).toBe("mixed");
    expect(screen.getByText("已选 1 项")).toBeDefined();
    expect(screen.getByRole("button", { name: "移入文件夹" })).toBeDefined();
    expect(screen.getByRole("button", { name: "加标签" })).toBeDefined();
    expect(screen.getByRole("button", { name: "摘标签" })).toBeDefined();
    expect(screen.getByRole("button", { name: "反选" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "删除选中的条目" }),
    ).toBeDefined();
  });
});

describe("EntryBatchBar 反选与范围", () => {
  it("反选把没勾选的变成勾选, 勾选的变成不勾选", async () => {
    const environment = await renderBar();
    checkEntries(environment, ["forum"]);

    await userEvent.setup().click(screen.getByRole("button", { name: "反选" }));

    expect(checkedIdsOf(environment)).toEqual(["bank", "wiki"]);
    expect(screen.getByText("已选 2 项")).toBeDefined();
  });

  it("搜索使条目不可见后取消它们的勾选, 数量随之变化", async () => {
    const environment = await renderBar();
    checkEntries(environment, ["forum", "bank"]);

    await act(async () => {
      environment.entryStore.getState().setQuery("bank");
      await environment.entryStore.getState().search();
    });

    expect(checkedIdsOf(environment)).toEqual(["bank"]);
    expect(screen.getByText("已选 1 项")).toBeDefined();
  });

  it("没有条目时不显示选择栏", async () => {
    await renderBar([]);

    expect(screen.queryByRole("group", { name: "批量操作" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "全选" })).toBeNull();
  });
});
