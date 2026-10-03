import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { getEntryListItems } from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
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
    expect(environment.tagStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 按名称与条目数取侧栏的一行入口按钮, 按钮的名称形如 "工作 2".
 * @param label 入口名称.
 * @param count 入口里的条目数.
 * @returns 入口按钮元素.
 */
function navButton(label: string, count: number): HTMLElement {
  return screen.getByRole("button", {
    name: new RegExp(`^${label}\\s*${count}$`),
  });
}

/**
 * 打开标签行尾的更多菜单, 点其中一项.
 * @param tagName 标签名称.
 * @param itemName 菜单项名称.
 */
async function chooseTagAction(
  tagName: string,
  itemName: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: `${tagName} 的更多操作` }),
  );
  await user.click(await screen.findByRole("menuitem", { name: itemName }));
}

describe("侧栏标签分区", () => {
  it("每个标签一行, 显示带这个标签的条目总数", async () => {
    await renderWorkspace();

    expect(navButton("重要", 1)).toBeDefined();
    expect(navButton("工作", 2)).toBeDefined();
    expect(navButton("个人", 0)).toBeDefined();
  });

  it("没有标签时显示空状态说明", async () => {
    await renderWorkspace({ tags: [] });

    expect(screen.getByText("还没有标签")).toBeDefined();
  });

  it("读取标签失败时说明原因", async () => {
    const environment = await createEntryTestEnvironment({
      tagBridgeOverrides: {
        list: () => Promise.resolve({ ok: false, reason: "vault-locked" }),
      },
    });
    render(<UnlockedWorkspace />, { wrapper: environment.Providers });

    expect(
      await screen.findByText("无法读取标签. 请关闭应用后重试."),
    ).toBeDefined();
  });
});

describe("新建标签", () => {
  it("填写名称后创建, 默认第一种颜色, 新标签出现在侧栏并追加到 store 列表末尾, 条目数为 0", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建标签" }));
    const dialog = await screen.findByRole("dialog", { name: "新建标签" });
    await user.type(within(dialog).getByLabelText("名称"), "  学习  ");
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(navButton("学习", 0)).toBeDefined();
    expect(environment.tagStore.getState().tags.at(-1)).toEqual({
      id: "created-tag-1",
      name: "学习",
      color: "slate",
    });
  });

  it("调色板里选了颜色后创建, 标签带上所选颜色", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建标签" }));
    const dialog = await screen.findByRole("dialog", { name: "新建标签" });
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

    await user.click(screen.getByRole("button", { name: "新建标签" }));
    const dialog = await screen.findByRole("dialog", { name: "新建标签" });
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

    await user.click(screen.getByRole("button", { name: "新建标签" }));
    const dialog = await screen.findByRole("dialog", { name: "新建标签" });
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    expect(await within(dialog).findByText("请填写名称.")).toBeDefined();
    expect(environment.tagBridge.create).not.toHaveBeenCalled();
  });

  it("名称超过 50 个字符时提示, 不创建", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建标签" }));
    const dialog = await screen.findByRole("dialog", { name: "新建标签" });
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

    await user.click(screen.getByRole("button", { name: "新建标签" }));
    const dialog = await screen.findByRole("dialog", { name: "新建标签" });
    await user.type(within(dialog).getByLabelText("名称"), "工作");
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    expect(
      await within(dialog).findByText("已有同名标签, 请换一个名称."),
    ).toBeDefined();
    await user.clear(within(dialog).getByLabelText("名称"));
    await user.type(within(dialog).getByLabelText("名称"), "学习");
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(navButton("学习", 0)).toBeDefined();
  });

  it("取消不创建", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建标签" }));
    const dialog = await screen.findByRole("dialog", { name: "新建标签" });
    await user.click(within(dialog).getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(environment.tagBridge.create).not.toHaveBeenCalled();
  });
});

describe("编辑标签", () => {
  it("输入框预填现在的名称, 调色板选中现在的颜色, 保存后列表里是新名称, 条目数不变", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await chooseTagAction("工作", "编辑");
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
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(navButton("公司", 2)).toBeDefined();
    expect(screen.queryByRole("button", { name: /^工作\s*2$/ })).toBeNull();
    expect(environment.tagStore.getState().tags[1]).toEqual({
      id: "work-tag",
      name: "公司",
      color: "orange",
    });
  });

  it("只改颜色, 名称不变时可以保存", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await chooseTagAction("重要", "编辑");
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

    await chooseTagAction("工作", "编辑");
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

    await chooseTagAction("工作", "删除");
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(
      '"工作" 将被删除, 2 个条目会摘掉这个标签, 条目本身不会删除.',
    );
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(screen.queryByRole("button", { name: /^工作/ })).toBeNull();
    expect(navButton("全部条目", 3)).toBeDefined();
    expect(
      environment.entryStore.getState().entries.map((entry) => entry.tagIds),
    ).toEqual([["important"], undefined, undefined]);
  });

  it("没有条目带的标签, 确认框不提条目, 取消后标签保留", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await chooseTagAction("个人", "删除");
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain('"个人" 将被删除.');
    expect(dialog.textContent).not.toContain("个条目");
    await user.click(within(dialog).getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(navButton("个人", 0)).toBeDefined();
  });
});

describe("删除已选中的标签与失败", () => {
  it("删除的正是已选中的标签时, 筛选解除, 列表恢复", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.click(navButton("工作", 2));
    expect(getEntryListItems()).toHaveLength(2);

    await chooseTagAction("工作", "删除");
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(getEntryListItems()).toHaveLength(3);
    });
  });

  it("删除失败时说明原因, 标签保留", async () => {
    const environment = await renderWorkspace({
      tagBridgeOverrides: {
        remove: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });
    const user = userEvent.setup();

    await chooseTagAction("个人", "删除");
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    expect(
      await within(dialog).findByText("删除失败. 请关闭应用后重试."),
    ).toBeDefined();
    expect(environment.tagStore.getState().tags).toEqual(TEST_TAGS);
  });
});
