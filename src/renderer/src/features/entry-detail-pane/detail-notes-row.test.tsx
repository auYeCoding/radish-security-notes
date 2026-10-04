import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";

import { WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { EntryDetailPane } from "./entry-detail-pane";

/**
 * 多行 Markdown 备注: 标题, 列表与链接.
 */
const MARKDOWN_NOTES =
  "# 标题\n\n- 要点一\n- 要点二\n\n[官网](https://example.test)";

/**
 * 在条目环境里选中一个条目后渲染详情窗格.
 * @param detail 要展示的条目详情.
 * @returns 渲染所用的环境.
 */
async function renderDetail(
  detail: EntryDetail,
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({ entries: [detail] });
  await environment.entryStore.getState().select(detail.id);
  render(<EntryDetailPane />, { wrapper: environment.Providers });
  return environment;
}

describe("详情备注行: 纯文本", () => {
  it("保持原样与换行, 不解释 Markdown 标记", async () => {
    await renderDetail({
      ...WALLET_ENTRY,
      notes: "# 不是标题\n- 不是列表",
      notesFormat: "plain",
    });

    expect(screen.queryByRole("heading", { name: "不是标题" })).toBeNull();
    expect(screen.queryAllByRole("list")).toEqual([]);
    const shownTexts = Array.from(
      document.querySelectorAll("span.whitespace-pre-wrap"),
    ).map((element) => element.textContent);
    expect(shownTexts).toContain("# 不是标题\n- 不是列表");
  });

  it("纯文本里的 HTML 与链接标记也只是文字", async () => {
    await renderDetail({
      ...WALLET_ENTRY,
      notes: "<b>粗</b> [官网](https://example.test)",
      notesFormat: "plain",
    });

    expect(document.querySelector("b")).toBeNull();
    expect(screen.queryByRole("button", { name: "官网" })).toBeNull();
    expect(
      screen.getByText("<b>粗</b> [官网](https://example.test)"),
    ).toBeDefined();
  });
});

describe("详情备注行: Markdown", () => {
  it("按 Markdown 渲染标题, 列表与链接", async () => {
    await renderDetail({
      ...WALLET_ENTRY,
      notes: MARKDOWN_NOTES,
      notesFormat: "markdown",
    });

    expect(screen.getByRole("heading", { name: "标题" })).toBeDefined();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["要点一", "要点二"]);
    expect(screen.getByRole("button", { name: "官网" })).toBeDefined();
  });

  it("复制备注复制的是原文, 含 Markdown 标记", async () => {
    const { entryBridge } = await renderDetail({
      ...WALLET_ENTRY,
      notes: MARKDOWN_NOTES,
      notesFormat: "markdown",
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "复制 备注" }));

    expect(entryBridge.copyField).toHaveBeenCalledWith("wallet", "notes");
  });

  it("没有备注时显示未填写并禁用复制, 与纯文本一致", async () => {
    await renderDetail({ ...WALLET_ENTRY, notes: "", notesFormat: "markdown" });

    const copy = screen.getByRole("button", {
      name: "复制 备注",
    }) as HTMLButtonElement;
    expect(copy.disabled).toBe(true);
    expect(screen.getAllByText("未填写").length).toBeGreaterThan(0);
  });
});
