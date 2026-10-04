import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MAX_PREVIEW_BYTES } from "@shared/attachments/attachment-limits";

import { WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import { failingAttachmentWith } from "@renderer/testing/fake-attachment-bridge";

import { AttachmentSection } from "./attachment-section";

/**
 * 测试用的四个附件: 普通文件, 可预览的图片, 超过预览上限的图片, 可执行文件.
 */
const MIXED = {
  [WALLET_ENTRY.id]: [
    { id: "a-1", name: "恢复码.txt", size: 20 },
    { id: "a-2", name: "截图.png", size: 2048 },
    { id: "a-3", name: "大图.png", size: MAX_PREVIEW_BYTES + 1 },
    { id: "a-4", name: "setup.exe", size: 4096 },
  ],
};

/**
 * 渲染钱包条目的附件区, 等附件列表读完.
 * @param overrides 覆盖假附件桥上的方法.
 * @returns 渲染所用的环境.
 */
async function renderMixed(
  overrides: Parameters<typeof createEntryTestEnvironment>[0] = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    attachments: MIXED,
    ...overrides,
  });
  render(<AttachmentSection entryId={WALLET_ENTRY.id} />, {
    wrapper: environment.Providers,
  });
  await screen.findByText("恢复码.txt");
  return environment;
}

/**
 * 按名称取一个按钮, 取不到时返回 null.
 * @param name 按钮的无障碍名称.
 * @returns 按钮元素或 null.
 */
function buttonNamed(name: string): HTMLElement | null {
  return screen.queryByRole("button", { name });
}

describe("附件行的操作按钮", () => {
  it("普通文件有打开, 另存为与删除, 没有预览", async () => {
    await renderMixed();

    expect(buttonNamed("打开 恢复码.txt")).not.toBeNull();
    expect(buttonNamed("另存 恢复码.txt 为")).not.toBeNull();
    expect(buttonNamed("删除 恢复码.txt")).not.toBeNull();
    expect(buttonNamed("预览 恢复码.txt")).toBeNull();
  });

  it("不超过预览上限的图片有预览, 超过的没有", async () => {
    await renderMixed();

    expect(buttonNamed("预览 截图.png")).not.toBeNull();
    expect(buttonNamed("预览 大图.png")).toBeNull();
    expect(buttonNamed("打开 大图.png")).not.toBeNull();
  });

  it("可执行文件没有打开和预览, 只能另存为或删除", async () => {
    await renderMixed();

    expect(buttonNamed("打开 setup.exe")).toBeNull();
    expect(buttonNamed("预览 setup.exe")).toBeNull();
    expect(buttonNamed("另存 setup.exe 为")).not.toBeNull();
    expect(buttonNamed("删除 setup.exe")).not.toBeNull();
  });
});

describe("另存为与打开", () => {
  it("点另存为调用桥, 用户取消或保存成功都不提示", async () => {
    const { attachmentBridge } = await renderMixed();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "另存 恢复码.txt 为" }));

    expect(attachmentBridge.saveAs).toHaveBeenCalledWith("a-1");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("写出失败时提示, 附件仍在", async () => {
    await renderMixed({
      attachmentBridgeOverrides: {
        saveAs: failingAttachmentWith("write-failed"),
      },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "另存 恢复码.txt 为" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "无法写出文件",
    );
    expect(screen.getByText("恢复码.txt")).toBeDefined();
  });

  it("点打开调用桥, 系统没有打开时提示改用另存为", async () => {
    const { attachmentBridge } = await renderMixed({
      attachmentBridgeOverrides: { open: failingAttachmentWith("open-failed") },
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "打开 恢复码.txt" }));

    expect(attachmentBridge.open).toHaveBeenCalledWith("a-1");
    expect((await screen.findByRole("alert")).textContent).toContain("另存为");
  });
});
