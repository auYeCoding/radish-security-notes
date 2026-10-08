import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  FADE_IN_MOTION,
  FAST_STATE_TRANSITION,
} from "@renderer/components/ui/state-motion";
import {
  checkEntries,
  renderWithLoadedStores,
} from "@renderer/testing/batch-test-helpers";
import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";

import { EntryBatchBar } from "./entry-batch-bar";

/**
 * 渲染带三个条目的选择栏, 并勾选一个条目让批量按钮组出现.
 */
async function renderBarWithChecked(): Promise<void> {
  const environment = await renderWithLoadedStores(<EntryBatchBar />, {
    entries: TEST_ENTRIES,
  });
  checkEntries(environment, ["forum"]);
}

describe("批量选择栏的动效", () => {
  it("没有勾选时没有按钮组, 勾选后按钮组快档淡入出现", async () => {
    const environment = await renderWithLoadedStores(<EntryBatchBar />, {
      entries: TEST_ENTRIES,
    });
    expect(document.querySelector(".ms-auto")).toBeNull();

    checkEntries(environment, ["forum"]);

    expectMotionClasses(document.querySelector(".ms-auto"), FADE_IN_MOTION);
  });

  it("批量操作按钮继承快档状态过渡, 不用 transition-all", async () => {
    await renderBarWithChecked();

    const button = screen.getByRole("button", { name: "删除选中的条目" });

    expectMotionClasses(button, FAST_STATE_TRANSITION);
    expectNoClassContaining(button, ["transition-all", "transition-["]);
  });

  it("全选框继承快档状态过渡", async () => {
    await renderBarWithChecked();

    expectMotionClasses(
      screen.getByRole("checkbox", { name: "全选" }),
      FAST_STATE_TRANSITION,
    );
  });
});
