import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";

import { WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import { renderOpenedEditEntryDialog } from "@renderer/testing/render-edit-entry-dialog";

import { EditEntryTrigger } from "./edit-entry-trigger";

/**
 * 一个备注是 Markdown 的条目.
 */
const MARKDOWN_ENTRY: EntryDetail = {
  ...WALLET_ENTRY,
  notes: "# 标题\n\n- 要点",
  notesFormat: "markdown",
};

/**
 * 渲染编辑入口, 打开给定条目的编辑对话框.
 * @param detail 要编辑的条目详情.
 * @returns 渲染所用的环境.
 */
function openDialogOf(
  detail: EntryDetail,
): ReturnType<typeof renderOpenedEditEntryDialog> {
  return renderOpenedEditEntryDialog(
    (current) => <EditEntryTrigger detail={current} />,
    detail,
  );
}

/**
 * 取备注格式选择里的一个按钮.
 * @param name 按钮的名称, 即格式的名称.
 * @returns 格式按钮元素.
 */
function getFormatButton(name: string): HTMLElement {
  const group = screen.getByRole("group", { name: "备注格式" });
  return within(group).getByRole("button", { name });
}

describe("编辑表单 备注格式预选", () => {
  it("纯文本条目预选纯文本", async () => {
    await openDialogOf(WALLET_ENTRY);

    expect(getFormatButton("纯文本").getAttribute("aria-pressed")).toBe("true");
    expect(getFormatButton("Markdown").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("Markdown 条目预选 Markdown, 备注原文预填在输入框里", async () => {
    await openDialogOf(MARKDOWN_ENTRY);

    expect(getFormatButton("Markdown").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect((screen.getByLabelText("备注") as HTMLTextAreaElement).value).toBe(
      "# 标题\n\n- 要点",
    );
  });
});

describe("编辑表单 备注格式保存", () => {
  it("不改动直接保存, 格式保持原样", async () => {
    const { entryBridge } = await openDialogOf(MARKDOWN_ENTRY);

    await userEvent.setup().click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledWith(
      "wallet",
      expect.objectContaining({ notesFormat: "markdown" }),
    );
  });

  it("把纯文本改成 Markdown 后保存, 详情随之变成 Markdown", async () => {
    const { entryBridge, entryStore } = await openDialogOf(WALLET_ENTRY);
    const user = userEvent.setup();

    await user.click(getFormatButton("Markdown"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledWith(
      "wallet",
      expect.objectContaining({
        notes: WALLET_ENTRY.notes,
        notesFormat: "markdown",
      }),
    );
    expect(entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: { notesFormat: "markdown" },
    });
  });

  it("把 Markdown 改回纯文本后保存, 备注原文不变", async () => {
    const { entryBridge } = await openDialogOf(MARKDOWN_ENTRY);
    const user = userEvent.setup();

    await user.click(getFormatButton("纯文本"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).toHaveBeenCalledWith(
      "wallet",
      expect.objectContaining({
        notes: MARKDOWN_ENTRY.notes,
        notesFormat: "plain",
      }),
    );
  });
});
