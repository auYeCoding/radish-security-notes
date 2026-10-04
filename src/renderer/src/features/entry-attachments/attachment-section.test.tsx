import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import {
  FAKE_DIALOG_ATTACHMENT,
  failingAttachmentWith,
} from "@renderer/testing/fake-attachment-bridge";

import { AttachmentSection } from "./attachment-section";

/**
 * 测试用的两个已有附件, 都属于钱包条目.
 */
const EXISTING = {
  [WALLET_ENTRY.id]: [
    { id: "a-1", name: "证书-密钥(测试).pem", size: 1536 },
    { id: "a-2", name: "恢复码.txt", size: 20 },
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
  const environment = await createEntryTestEnvironment(options);
  render(<AttachmentSection entryId={WALLET_ENTRY.id} />, {
    wrapper: environment.Providers,
  });
  await screen.findByRole("heading", { name: /附件/ });
  return environment;
}

describe("附件区的内容", () => {
  it("标题带个数, 每行显示名称与大小, 向桥读取的是这个条目的附件", async () => {
    const { attachmentBridge } = await renderSection({ attachments: EXISTING });

    expect(await screen.findByText("证书-密钥(测试).pem")).toBeDefined();
    expect(screen.getByText("恢复码.txt")).toBeDefined();
    expect(screen.getByText("1.5 KB")).toBeDefined();
    expect(screen.getByText("20 B")).toBeDefined();
    expect(screen.getByRole("heading", { name: "附件 (2)" })).toBeDefined();
    expect(attachmentBridge.list).toHaveBeenCalledWith(WALLET_ENTRY.id);
  });

  it("没有附件时显示空状态说明, 添加按钮仍可用", async () => {
    await renderSection();

    expect(await screen.findByText(/还没有附件/)).toBeDefined();
    expect(screen.getByRole("heading", { name: "附件 (0)" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "添加附件" }).hasAttribute("disabled"),
    ).toBe(false);
  });

  it("读取附件失败时说明原因, 不显示列表", async () => {
    await renderSection({
      attachmentBridgeOverrides: {
        list: failingAttachmentWith("unexpected-error"),
      },
    });

    expect(await screen.findByText(/无法读取附件/)).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("从选择文件对话框添加", () => {
  it("点添加附件后调用桥, 新附件接在列表末尾, 个数随之增加", async () => {
    const { attachmentBridge } = await renderSection({
      attachments: EXISTING,
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "添加附件" }));

    const added = await screen.findByText(FAKE_DIALOG_ATTACHMENT.name);
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(attachmentBridge.addFromDialog).toHaveBeenCalledWith(
      WALLET_ENTRY.id,
    );
    expect(rows).toHaveLength(3);
    expect(rows[2]?.contains(added)).toBe(true);
    expect(screen.getByRole("heading", { name: "附件 (3)" })).toBeDefined();
  });

  it("用户取消对话框时不改变列表也不提示", async () => {
    await renderSection({
      attachments: EXISTING,
      attachmentBridgeOverrides: {
        addFromDialog: () =>
          Promise.resolve({ ok: true, value: { status: "cancelled" } }),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "添加附件" }));

    expect(screen.getByRole("heading", { name: "附件 (2)" })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
