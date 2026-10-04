import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  checkedIdsOf,
  checkRows,
  renderWithLoadedStores,
  rowButton,
  rowCheckbox,
} from "@renderer/testing/batch-test-helpers";
import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import type { EntryTestEnvironment } from "@renderer/testing/entry-test-environment";

import { EntryListPane } from "./entry-list-pane";

/**
 * 渲染带三个条目的列表窗格, 条目已读取.
 * @returns 渲染所用的环境.
 */
function renderPane(): Promise<EntryTestEnvironment> {
  return renderWithLoadedStores(<EntryListPane />, { entries: TEST_ENTRIES });
}

describe("EntryListPane 勾选框", () => {
  it("每行有带条目名的勾选框, 点击勾选, 再点取消", async () => {
    const environment = await renderPane();
    const user = userEvent.setup();

    await user.click(rowCheckbox("银行"));
    expect(checkedIdsOf(environment)).toEqual(["bank"]);
    expect(rowCheckbox("银行").getAttribute("aria-checked")).toBe("true");
    expect(rowCheckbox("论坛").getAttribute("aria-checked")).toBe("false");

    await user.click(rowCheckbox("银行"));
    expect(checkedIdsOf(environment)).toEqual([]);
  });

  it("勾选不改变查看详情的条目, 单击行查看详情也不改变勾选", async () => {
    const environment = await renderPane();
    const user = userEvent.setup();

    await user.click(rowCheckbox("论坛"));
    expect(environment.entryStore.getState().selection).toEqual({
      status: "none",
    });

    await user.click(rowButton("银行"));
    expect(environment.entryBridge.get).toHaveBeenCalledWith("bank");
    expect(checkedIdsOf(environment)).toEqual(["forum"]);
    expect(rowButton("银行").getAttribute("aria-current")).toBe("true");
  });
});

describe("EntryListPane 修饰键点击", () => {
  it("Ctrl 或 Meta 加点击切换勾选, 不读取详情", async () => {
    const environment = await renderPane();

    fireEvent.click(rowButton("论坛"), { ctrlKey: true });
    fireEvent.click(rowButton("银行"), { metaKey: true });
    expect(checkedIdsOf(environment)).toEqual(["bank", "forum"]);

    fireEvent.click(rowButton("论坛"), { ctrlKey: true });
    expect(checkedIdsOf(environment)).toEqual(["bank"]);
    expect(environment.entryBridge.get).not.toHaveBeenCalled();
  });

  it("Shift 加点击连选从起点到目标之间的全部可见条目", async () => {
    const environment = await renderPane();

    fireEvent.click(rowButton("论坛"), { ctrlKey: true });
    fireEvent.click(rowButton("银行"), { shiftKey: true });

    expect(checkedIdsOf(environment)).toEqual(["bank", "forum", "wiki"]);
    expect(environment.entryBridge.get).not.toHaveBeenCalled();
  });

  it("勾选框勾选的条目也是连选的起点, 没有起点时 Shift 点击只勾选那一行", async () => {
    const environment = await renderPane();
    fireEvent.click(rowButton("银行"), { shiftKey: true });
    expect(checkedIdsOf(environment)).toEqual(["bank"]);

    await checkRows(userEvent.setup(), ["论坛"]);
    fireEvent.click(rowButton("维基"), { shiftKey: true });

    expect(checkedIdsOf(environment)).toEqual(["bank", "forum", "wiki"]);
  });
});
