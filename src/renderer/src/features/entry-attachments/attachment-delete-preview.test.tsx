import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import {
  FAKE_PREVIEW_DATA_URL,
  failingAttachmentWith,
} from "@renderer/testing/fake-attachment-bridge";

import { AttachmentSection } from "./attachment-section";

/**
 * 测试用的两个已有附件, 都属于钱包条目.
 */
const EXISTING = {
  [WALLET_ENTRY.id]: [
    { id: "a-1", name: "恢复码.txt", size: 20 },
    { id: "a-2", name: "截图.png", size: 2048 },
  ],
};

/**
 * 渲染钱包条目的附件区, 等附件列表读完.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderSection(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    attachments: EXISTING,
    ...options,
  });
  render(<AttachmentSection entryId={WALLET_ENTRY.id} />, {
    wrapper: environment.Providers,
  });
  await screen.findByText("恢复码.txt");
  return environment;
}

/**
 * 点一个附件的删除按钮, 等确认框出现.
 * @param name 附件名称.
 */
async function openDeleteConfirm(name: string): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: `删除 ${name}` }));
  await screen.findByRole("alertdialog");
}

describe("删除附件的确认", () => {
  it("点删除只弹确认框, 写明附件名称与无法恢复, 不调用桥", async () => {
    const { attachmentBridge } = await renderSection();

    await openDeleteConfirm("恢复码.txt");

    expect(screen.getByText("删除这个附件?")).toBeDefined();
    expect(screen.getByText(/"恢复码.txt" 将被永久删除/)).toBeDefined();
    expect(attachmentBridge.remove).not.toHaveBeenCalled();
  });

  it("点取消或按 Esc 关闭确认框, 附件保留", async () => {
    const { attachmentBridge } = await renderSection();
    await openDeleteConfirm("恢复码.txt");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await openDeleteConfirm("恢复码.txt");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(attachmentBridge.remove).not.toHaveBeenCalled();
    expect(screen.getByText("恢复码.txt")).toBeDefined();
  });
});

describe("删除附件的执行", () => {
  it("点删除后调用桥, 这个附件从列表移除, 别的附件还在, 确认框关闭", async () => {
    const { attachmentBridge } = await renderSection();
    await openDeleteConfirm("恢复码.txt");

    await userEvent.setup().click(screen.getByRole("button", { name: "删除" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(attachmentBridge.remove).toHaveBeenCalledWith("a-1");
    expect(screen.queryByText("恢复码.txt")).toBeNull();
    expect(screen.getByText("截图.png")).toBeDefined();
    expect(screen.getByRole("heading", { name: "附件 (1)" })).toBeDefined();
  });

  it("删除失败时确认框保持打开并显示原因, 附件仍在", async () => {
    await renderSection({
      attachmentBridgeOverrides: {
        remove: failingAttachmentWith("unexpected-error"),
      },
    });
    await openDeleteConfirm("恢复码.txt");

    await userEvent.setup().click(screen.getByRole("button", { name: "删除" }));

    expect((await screen.findAllByRole("alert"))[0]?.textContent).toContain(
      "操作失败",
    );
    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect(screen.getByText("恢复码.txt")).toBeDefined();
  });
});

describe("图片预览", () => {
  it("点预览向桥取地址, 对话框里显示图片, 关闭后图片消失", async () => {
    const { attachmentBridge } = await renderSection();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "预览 截图.png" }));

    const image = await screen.findByRole("img", { name: "截图.png 的预览" });
    expect(image.getAttribute("src")).toBe(FAKE_PREVIEW_DATA_URL);
    expect(attachmentBridge.preview).toHaveBeenCalledWith("a-2");
    await user.click(screen.getByRole("button", { name: "关闭" }));
    await waitFor(() => expect(screen.queryByRole("img")).toBeNull());
  });

  it("预览失败时对话框里说明原因", async () => {
    await renderSection({
      attachmentBridgeOverrides: {
        preview: failingAttachmentWith("not-previewable"),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "预览 截图.png" }));

    expect(await screen.findByText("这个附件无法预览.")).toBeDefined();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
