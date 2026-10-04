import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  TEST_ENTRIES,
} from "@renderer/testing/entry-fixtures";
import { getEntryList } from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import { FAKE_DIALOG_ATTACHMENT } from "@renderer/testing/fake-attachment-bridge";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 在条目环境里渲染解锁后的工作区, 论坛条目带两个附件, 银行条目没有附件, 等条目读取完成.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: TEST_ENTRIES,
    attachments: {
      [FORUM_ENTRY.id]: [
        { id: "a-1", name: "恢复码.txt", size: 20 },
        { id: "a-2", name: "证书-密钥(测试).pem", size: 1536 },
      ],
    },
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 在列表里点选一个条目, 等右侧详情显示它的名称.
 * @param name 条目名称.
 */
async function selectByName(name: string): Promise<void> {
  const listItem = within(getEntryList()).getByRole("button", {
    name: new RegExp(name),
  });
  await userEvent.setup().click(listItem);
  await screen.findByRole("heading", { name });
}

describe("工作区里的附件区", () => {
  it("选中条目后详情里出现它自己的附件, 切换条目后换成另一个条目的附件", async () => {
    await renderWorkspace();

    await selectByName(FORUM_ENTRY.name);
    expect(await screen.findByText("恢复码.txt")).toBeDefined();
    await selectByName(BANK_ENTRY.name);

    expect(await screen.findByText(/还没有附件/)).toBeDefined();
    expect(screen.queryByText("恢复码.txt")).toBeNull();
  });

  it("给一个条目添加附件后切走再切回来, 附件仍在", async () => {
    const { attachmentBridge } = await renderWorkspace();
    await selectByName(BANK_ENTRY.name);
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "添加附件" }));
    await screen.findByText(FAKE_DIALOG_ATTACHMENT.name);

    await selectByName(FORUM_ENTRY.name);
    await selectByName(BANK_ENTRY.name);

    expect(await screen.findByText(FAKE_DIALOG_ATTACHMENT.name)).toBeDefined();
    expect(attachmentBridge.addFromDialog).toHaveBeenCalledWith(BANK_ENTRY.id);
  });

  it("删除条目后它的附件不再显示, 详情里换成相邻条目自己的附件区", async () => {
    const { attachmentBridge } = await renderWorkspace();
    await selectByName(FORUM_ENTRY.name);
    await screen.findByText("恢复码.txt");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "删除条目" }));
    await user.click(await screen.findByRole("button", { name: "删除" }));

    await waitFor(() => expect(screen.queryByText("恢复码.txt")).toBeNull());
    expect(attachmentBridge.list).toHaveBeenCalledWith(FORUM_ENTRY.id);
    expect(screen.queryByText("证书-密钥(测试).pem")).toBeNull();
  });
});
