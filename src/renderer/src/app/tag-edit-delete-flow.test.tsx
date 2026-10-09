import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { isDialogMounted } from "@renderer/testing/open-settings-dialog";
import {
  listedTagNames,
  openTagSection,
} from "@renderer/testing/open-tag-section";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 论坛带重要与工作标签, 银行带工作标签, 维基没有标签.
 */
const TAGGED_ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, tagIds: ["important", "work-tag"] },
  { ...BANK_ENTRY, tagIds: ["work-tag"] },
  WIKI_ENTRY,
];

/**
 * 在条目环境里渲染解锁后的工作区, 等条目与标签读取完成.
 * @param options 条目环境的选项, 默认带三个标签与三个条目.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: TAGGED_ENTRIES,
    tags: TEST_TAGS,
    ...options,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.tagStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 打开标签行尾的更多菜单, 点其中一项.
 * @param section 标签分区元素.
 * @param tagName 标签名称.
 * @param itemName 菜单项名称.
 */
async function chooseTagAction(
  section: HTMLElement,
  tagName: string,
  itemName: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.click(
    within(section).getByRole("button", { name: `${tagName} 的更多操作` }),
  );
  await user.click(await screen.findByRole("menuitem", { name: itemName }));
}

describe("编辑标签", () => {
  it("输入框预填现在的名称, 调色板选中现在的颜色, 保存后列表里是新名称", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    await chooseTagAction(section, "工作", "编辑");
    const dialog = await screen.findByRole("dialog", { name: "编辑标签" });
    const input = within(dialog).getByLabelText("名称");
    expect((input as HTMLInputElement).value).toBe("工作");
    expect(
      within(dialog)
        .getByRole("button", { name: "蓝色" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await user.clear(input);
    await user.type(input, "公司");
    await user.click(within(dialog).getByRole("button", { name: "橙色" }));
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(isDialogMounted("编辑标签")).toBe(false);
    });
    expect(listedTagNames(section)).toContain("公司");
    expect(listedTagNames(section)).not.toContain("工作");
    expect(environment.tagStore.getState().tags[1]).toEqual({
      id: "work-tag",
      name: "公司",
      color: "orange",
    });
  });

  it("只改颜色, 名称不变时可以保存", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    await chooseTagAction(section, "重要", "编辑");
    const dialog = await screen.findByRole("dialog", { name: "编辑标签" });
    await user.click(within(dialog).getByRole("button", { name: "紫色" }));
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(environment.tagBridge.update).toHaveBeenCalledWith(
        "important",
        "重要",
        "violet",
      );
    });
  });
});

describe("编辑标签的校验", () => {
  it("改成别的标签的名称时提示重名, 列表不变", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    await chooseTagAction(section, "工作", "编辑");
    const dialog = await screen.findByRole("dialog", { name: "编辑标签" });
    const input = within(dialog).getByLabelText("名称");
    await user.clear(input);
    await user.type(input, "个人");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    expect(
      await within(dialog).findByText("已有同名标签, 请换一个名称."),
    ).toBeDefined();
    expect(environment.tagStore.getState().tags).toEqual(TEST_TAGS);
  });
});

describe("删除标签", () => {
  it("确认框写明带这个标签的条目数与摘掉标签, 确认后标签消失, 条目保留", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    await chooseTagAction(section, "工作", "删除");
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(
      '"工作" 将被删除, 2 个条目会摘掉这个标签, 条目本身不会删除.',
    );
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(listedTagNames(section)).not.toContain("工作");
    expect(environment.entryStore.getState().entries).toHaveLength(3);
    expect(
      environment.entryStore.getState().entries.map((entry) => entry.tagIds),
    ).toEqual([["important"], undefined, undefined]);
  });

  it("没有条目带的标签, 确认框不提条目, 取消后标签保留", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    await chooseTagAction(section, "个人", "删除");
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain('"个人" 将被删除.');
    expect(dialog.textContent).not.toContain("个条目");
    await user.click(within(dialog).getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(listedTagNames(section)).toContain("个人");
  });
});

describe("删除标签失败", () => {
  it("删除失败时说明原因, 标签保留", async () => {
    const environment = await renderWorkspace({
      tagBridgeOverrides: {
        remove: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });
    const user = userEvent.setup();
    const section = await openTagSection();

    await chooseTagAction(section, "个人", "删除");
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    expect(
      await within(dialog).findByText("删除失败. 请关闭应用后重试."),
    ).toBeDefined();
    expect(environment.tagStore.getState().tags).toEqual(TEST_TAGS);
  });
});
