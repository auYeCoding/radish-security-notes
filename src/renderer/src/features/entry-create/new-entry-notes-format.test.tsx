import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderOpenedNewEntryForm } from "@renderer/testing/render-new-entry-dialog";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 渲染新建入口, 打开通用登录的表单.
 * @returns 渲染所用的环境.
 */
function renderLoginForm(): ReturnType<typeof renderOpenedNewEntryForm> {
  return renderOpenedNewEntryForm(<NewEntryTrigger />, "通用登录");
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

describe("新建表单 备注格式选择", () => {
  it("备注旁有纯文本与 Markdown 两个选项, 默认选中纯文本", async () => {
    await renderLoginForm();

    expect(getFormatButton("纯文本").getAttribute("aria-pressed")).toBe("true");
    expect(getFormatButton("Markdown").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("点选 Markdown 后选中它, 再点一次不会取消选择", async () => {
    await renderLoginForm();
    const user = userEvent.setup();

    await user.click(getFormatButton("Markdown"));
    await user.click(getFormatButton("Markdown"));

    expect(getFormatButton("Markdown").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(getFormatButton("纯文本").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("切换格式不影响已经输入的备注", async () => {
    await renderLoginForm();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("备注"), "# 标题");

    await user.click(getFormatButton("Markdown"));

    expect((screen.getByLabelText("备注") as HTMLTextAreaElement).value).toBe(
      "# 标题",
    );
  });
});

describe("新建表单 备注格式保存", () => {
  it("选 Markdown 后保存, 带着格式与备注原文交给桥, 新条目详情是 Markdown", async () => {
    const { entryBridge, entryStore } = await renderLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "笔记");
    await user.type(screen.getByLabelText("备注"), "# 标题");
    await user.click(getFormatButton("Markdown"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "# 标题", notesFormat: "markdown" }),
    );
    expect(entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: { notes: "# 标题", notesFormat: "markdown" },
    });
  });

  it("不选格式直接保存是纯文本, 选了 Markdown 又改回纯文本也是纯文本", async () => {
    const { entryBridge } = await renderLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "笔记");
    await user.click(getFormatButton("Markdown"));
    await user.click(getFormatButton("纯文本"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.create).toHaveBeenCalledWith(
      expect.objectContaining({ notesFormat: "plain" }),
    );
  });
});
