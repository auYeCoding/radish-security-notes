import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CONTENT_ENTER_MOTION } from "@renderer/components/ui/state-motion";
import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import { expectMotionClasses } from "@renderer/testing/expect-motion-classes";

import { EntryDetailPane } from "./entry-detail-pane";

/**
 * 渲染出的详情窗格与它所用的环境.
 */
interface RenderedPane {
  /**
   * 渲染所用的环境.
   */
  readonly environment: EntryTestEnvironment;
  /**
   * 窗格的容器元素.
   */
  readonly container: HTMLElement;
}

/**
 * 选中一个条目后渲染详情窗格.
 * @param id 要选中的条目编号.
 * @returns 渲染所用的环境与窗格容器.
 */
async function renderPane(id: string): Promise<RenderedPane> {
  const environment = await createEntryTestEnvironment({
    entries: TEST_ENTRIES,
  });
  await environment.entryStore.getState().select(id);
  const { container } = render(<EntryDetailPane />, {
    wrapper: environment.Providers,
  });
  return { environment, container };
}

/**
 * 取详情窗格里的详情内容根元素.
 * @param container 窗格容器.
 * @returns 详情内容根元素.
 */
function detailRootOf(container: HTMLElement): Element | null {
  return container.querySelector("section")?.firstElementChild ?? null;
}

describe("条目详情内容的切换动效", () => {
  it("详情内容挂载时淡入并上移到位", async () => {
    const { container } = await renderPane("forum");

    expectMotionClasses(detailRootOf(container), CONTENT_ENTER_MOTION);
  });

  it("切换到另一个条目时换成新的详情元素, 新元素同样入场", async () => {
    const { environment, container } = await renderPane("forum");
    const previousRoot = detailRootOf(container);

    await act(() => environment.entryStore.getState().select("bank"));

    await screen.findByRole("heading", { name: "银行" });
    const nextRoot = detailRootOf(container);
    expect(nextRoot).not.toBe(previousRoot);
    expectMotionClasses(nextRoot, CONTENT_ENTER_MOTION);
  });

  it("没有选中条目时的提示文字不淡入", async () => {
    const environment = await createEntryTestEnvironment({
      entries: TEST_ENTRIES,
    });
    const { container } = render(<EntryDetailPane />, {
      wrapper: environment.Providers,
    });

    expect(container.querySelector("[class*='animate-in']")).toBeNull();
    expect(screen.getByText("选择一个条目查看详情")).toBeDefined();
  });
});
