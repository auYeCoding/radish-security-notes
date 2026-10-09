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
 * 在条目环境里渲染解锁后的工作区, 等条目, 文件夹与标签读取完成.
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
    expect(environment.tagStore.getState().loadStatus).not.toBe("loading");
  });
  return environment;
}

/**
 * 点标签分区里的新建标签按钮, 等新建对话框出现.
 * @param section 标签分区元素.
 * @returns 新建标签对话框元素.
 */
async function openNewTagDialog(section: HTMLElement): Promise<HTMLElement> {
  await userEvent
    .setup()
    .click(within(section).getByRole("button", { name: "新建标签" }));
  return screen.findByRole("dialog", { name: "新建标签" });
}

describe("设置里的标签分区", () => {
  it("每个标签一行, 每行都有更多菜单", async () => {
    await renderWorkspace();

    const section = await openTagSection();

    expect(listedTagNames(section).sort()).toEqual(["个人", "工作", "重要"]);
    ["个人", "工作", "重要"].forEach((name) =>
      expect(
        within(section).getByRole("button", { name: `${name} 的更多操作` }),
      ).toBeDefined(),
    );
  });

  it("没有标签时显示空状态说明", async () => {
    await renderWorkspace({ tags: [] });

    const section = await openTagSection();

    expect(within(section).getByText("还没有标签")).toBeDefined();
    expect(listedTagNames(section)).toEqual([]);
  });

  it("读取标签失败时说明原因", async () => {
    const environment = await createEntryTestEnvironment({
      tagBridgeOverrides: {
        list: () => Promise.resolve({ ok: false, reason: "vault-locked" }),
      },
    });
    render(<UnlockedWorkspace />, { wrapper: environment.Providers });
    await waitFor(() => {
      expect(environment.tagStore.getState().loadStatus).toBe("failed");
    });

    const section = await openTagSection();

    expect(
      within(section).getByText("无法读取标签. 请关闭应用后重试."),
    ).toBeDefined();
  });
});

describe("新建标签", () => {
  it("填写名称后创建, 默认第一种颜色, 新标签出现在设置的标签列表并追加到 store 列表末尾", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    const dialog = await openNewTagDialog(section);
    await user.type(within(dialog).getByLabelText("名称"), "  学习  ");
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(isDialogMounted("新建标签")).toBe(false);
    });
    expect(listedTagNames(section)).toContain("学习");
    expect(environment.tagStore.getState().tags.at(-1)).toEqual({
      id: "created-tag-1",
      name: "学习",
      color: "slate",
    });
  });

  it("调色板里选了颜色后创建, 标签带上所选颜色", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    const dialog = await openNewTagDialog(section);
    await user.type(within(dialog).getByLabelText("名称"), "学习");
    await user.click(within(dialog).getByRole("button", { name: "绿色" }));
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(environment.tagBridge.create).toHaveBeenCalledWith(
        "学习",
        "green",
      );
    });
  });

  it("调色板默认选中第一种颜色, 点另一种后只有它被选中", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    const dialog = await openNewTagDialog(section);
    const gray = within(dialog).getByRole("button", { name: "灰色" });
    const red = within(dialog).getByRole("button", { name: "红色" });
    expect(gray.getAttribute("aria-pressed")).toBe("true");
    await user.click(red);

    expect(red.getAttribute("aria-pressed")).toBe("true");
    expect(gray.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("新建标签时的校验", () => {
  it("名称为空时提示请填写名称, 不创建", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    const dialog = await openNewTagDialog(section);
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    expect(await within(dialog).findByText("请填写名称.")).toBeDefined();
    expect(environment.tagBridge.create).not.toHaveBeenCalled();
  });

  it("名称超过 50 个字符时提示, 不创建", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    const dialog = await openNewTagDialog(section);
    await user.type(within(dialog).getByLabelText("名称"), "长".repeat(51));
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    expect(
      await within(dialog).findByText("名称最多 50 个字符."),
    ).toBeDefined();
    expect(environment.tagBridge.create).not.toHaveBeenCalled();
  });
});

describe("新建标签时重名与取消", () => {
  it("与已有标签重名时对话框保持打开并提示, 改名后可以创建", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    const dialog = await openNewTagDialog(section);
    await user.type(within(dialog).getByLabelText("名称"), "工作");
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    expect(
      await within(dialog).findByText("已有同名标签, 请换一个名称."),
    ).toBeDefined();
    await user.clear(within(dialog).getByLabelText("名称"));
    await user.type(within(dialog).getByLabelText("名称"), "学习");
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(isDialogMounted("新建标签")).toBe(false);
    });
    expect(listedTagNames(section)).toContain("学习");
  });

  it("取消不创建", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    const section = await openTagSection();

    const dialog = await openNewTagDialog(section);
    await user.click(within(dialog).getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(isDialogMounted("新建标签")).toBe(false);
    });
    expect(environment.tagBridge.create).not.toHaveBeenCalled();
  });
});
