import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { failingAttachmentWith } from "@renderer/testing/fake-attachment-bridge";

import { AttachmentSection } from "./attachment-section";

/**
 * 测试用的一个已有附件, 属于钱包条目.
 */
const EXISTING = {
  [WALLET_ENTRY.id]: [{ id: "a-1", name: "恢复码.txt", size: 20 }],
};

/**
 * 渲染钱包条目的附件区, 等附件列表读完.
 * @param options 条目环境的选项.
 * @returns 渲染完成后兑现.
 */
async function renderSection(
  options: EntryTestEnvironmentOptions,
): Promise<void> {
  const environment = await createEntryTestEnvironment({
    attachments: EXISTING,
    ...options,
  });
  render(<AttachmentSection entryId={WALLET_ENTRY.id} />, {
    wrapper: environment.Providers,
  });
  await screen.findByText("恢复码.txt");
}

describe("添加失败的提示", () => {
  it("有文件不合规时提示带文件名的原因, 列表保持原样", async () => {
    await renderSection({
      attachmentBridgeOverrides: {
        addFromDialog: failingAttachmentWith("empty-file", "空.txt"),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "添加附件" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain('"空.txt" 是空文件');
    expect(screen.getByRole("heading", { name: "附件 (1)" })).toBeDefined();
  });

  it("超限的提示写明上限", async () => {
    await renderSection({
      attachmentBridgeOverrides: {
        addFromDialog: failingAttachmentWith("file-too-large", "大.bin"),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "添加附件" }));

    expect((await screen.findByRole("alert")).textContent).toContain("25 MB");
  });

  it("点提示条的关闭按钮关闭提示, 下一次操作开始时也会清除上一条提示", async () => {
    await renderSection({
      attachmentBridgeOverrides: {
        addFromDialog: failingAttachmentWith("read-failed", "坏.txt"),
      },
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "添加附件" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "关闭提示" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await user.click(screen.getByRole("button", { name: "添加附件" }));

    expect((await screen.findByRole("alert")).textContent).toContain("坏.txt");
  });
});

describe("添加进行中", () => {
  it("进行中添加按钮禁用并显示进行中的文案, 结束后恢复", async () => {
    let finish: () => void = () => undefined;
    await renderSection({
      attachmentBridgeOverrides: {
        addFromDialog: () =>
          new Promise((resolve) => {
            finish = () =>
              resolve({ ok: true, value: { status: "cancelled" } });
          }),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "添加附件" }));

    const busy = await screen.findByRole("button", { name: "正在添加..." });
    expect(busy.hasAttribute("disabled")).toBe(true);
    finish();
    await screen.findByRole("button", { name: "添加附件" });
  });
});
