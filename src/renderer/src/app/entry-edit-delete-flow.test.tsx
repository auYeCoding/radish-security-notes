import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  MAIL_ENTRY,
  TEST_ENTRIES,
  WALLET_ENTRY,
} from "@renderer/testing/entry-fixtures";
import {
  getEntryList,
  getEntryListItems,
} from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 在条目环境里渲染解锁后的工作区, 等条目读取完成.
 * @param entries 假桥里的初始条目.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(
  entries = TEST_ENTRIES,
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({ entries });
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

/**
 * 取列表窗格里全部条目项的文字.
 * @returns 每个条目项的文字.
 */
function listItemTexts(): string[] {
  return getEntryListItems().map((item) => item.textContent ?? "");
}

describe("工作区编辑条目", () => {
  it("在详情里编辑并保存后, 列表与详情立即显示新值", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await selectByName("银行");

    await user.click(screen.getByRole("button", { name: "编辑条目" }));
    const nameInput = await screen.findByLabelText("名称");
    await user.clear(nameInput);
    await user.type(nameInput, "新银行");
    await user.clear(screen.getByLabelText("账号"));
    await user.type(screen.getByLabelText("账号"), "new-bank-account");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("heading", { name: "新银行" })).toBeDefined();
    expect(screen.getByText("new-bank-account")).toBeDefined();
    expect(listItemTexts()[2]).toContain("新银行");
    expect(listItemTexts()[2]).toContain("new-bank-account");
  });

  it("编辑后复制的是新值", async () => {
    const { entryBridge } = await renderWorkspace();
    const user = userEvent.setup();
    await selectByName("银行");
    await user.click(screen.getByRole("button", { name: "编辑条目" }));
    const accountInput = await screen.findByLabelText("账号");
    await user.clear(accountInput);
    await user.type(accountInput, "edited-account");
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "复制 账号" }));

    expect(entryBridge.copyField).toHaveBeenCalledWith("bank", "account");
    expect(screen.getByText("edited-account")).toBeDefined();
  });

  it("取消编辑不改动列表与详情", async () => {
    const { entryBridge } = await renderWorkspace();
    const user = userEvent.setup();
    await selectByName("银行");

    await user.click(screen.getByRole("button", { name: "编辑条目" }));
    await user.type(await screen.findByLabelText("名称"), "改");
    await user.click(screen.getByRole("button", { name: "取消" }));
    await user.click(await screen.findByRole("button", { name: "放弃修改" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(entryBridge.update).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "银行" })).toBeDefined();
  });
});

describe("工作区编辑后的 TOTP", () => {
  it("替换 TOTP 后详情重新读取验证码, 已显示的密钥回到遮罩", async () => {
    const { totpBridge } = await renderWorkspace([MAIL_ENTRY]);
    const user = userEvent.setup();
    await selectByName("邮箱");
    await screen.findByRole("button", { name: /复制 验证码/ });
    await user.click(screen.getByRole("button", { name: "显示 TOTP 密钥" }));
    expect(await screen.findByText("JBSWY3DPEHPK3PXP")).toBeDefined();
    const before = vi.mocked(totpBridge.getCode).mock.calls.length;

    await user.click(screen.getByRole("button", { name: "编辑条目" }));
    await user.type(
      await screen.findByLabelText("TOTP 密钥或链接", { selector: "input" }),
      "GEZDGNBVGY3TQOJQ",
    );
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() =>
      expect(vi.mocked(totpBridge.getCode).mock.calls.length).toBeGreaterThan(
        before,
      ),
    );
    expect(screen.queryByText("JBSWY3DPEHPK3PXP")).toBeNull();
  });

  it("移除 TOTP 后详情不再有验证码与密钥", async () => {
    await renderWorkspace([MAIL_ENTRY]);
    const user = userEvent.setup();
    await selectByName("邮箱");
    await screen.findByRole("button", { name: /复制 验证码/ });

    await user.click(screen.getByRole("button", { name: "编辑条目" }));
    await user.click(
      await screen.findByRole("checkbox", { name: "移除 TOTP" }),
    );
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("button", { name: /复制 验证码/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "显示 TOTP 密钥" })).toBeNull();
  });
});

describe("工作区删除条目", () => {
  it("删除中间的条目后列表少一项并选中下一项", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await selectByName("银行");

    await user.click(screen.getByRole("button", { name: "删除条目" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "删除",
      }),
    );

    await waitFor(() => expect(getEntryListItems()).toHaveLength(2));
    expect(await screen.findByRole("heading", { name: "维基" })).toBeDefined();
    expect(screen.queryByText("银行")).toBeNull();
  });

  it("删除最后一个条目后回到空状态提示", async () => {
    await renderWorkspace([WALLET_ENTRY]);
    const user = userEvent.setup();
    await selectByName("钱包");

    await user.click(screen.getByRole("button", { name: "删除条目" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "删除",
      }),
    );

    expect(await screen.findByText("还没有条目")).toBeDefined();
    expect(screen.getByText("选择一个条目查看详情")).toBeDefined();
  });
});

describe("工作区取消删除与搜索中删除", () => {
  it("取消删除后条目保留", async () => {
    const { entryBridge } = await renderWorkspace();
    const user = userEvent.setup();
    await selectByName("银行");

    await user.click(screen.getByRole("button", { name: "删除条目" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "取消",
      }),
    );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(entryBridge.remove).not.toHaveBeenCalled();
    expect(getEntryListItems()).toHaveLength(3);
  });

  it("删除后搜索结果里不再有该条目", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.keyboard("bank");
    await selectByName("银行");

    await user.click(screen.getByRole("button", { name: "删除条目" }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "删除",
      }),
    );

    expect(await screen.findByText("没有匹配的条目")).toBeDefined();
    expect(screen.getByText("选择一个条目查看详情")).toBeDefined();
  });
});
