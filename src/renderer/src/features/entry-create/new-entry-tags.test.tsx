import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MAX_TAGS_PER_ENTRY } from "@shared/tags/tag-limits";
import type { TagSummary } from "@shared/tags/tag-types";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 渲染新建入口, 打开对话框并点选通用登录, 等表单出现. 打开之前侧栏选中的标签由调用方设定.
 * @param prepare 在渲染前对环境做的准备, 例如选中侧栏标签.
 * @param options 条目环境的选项, 默认带三个标签.
 * @returns 渲染所用的环境.
 */
async function openNewLoginForm(
  prepare: (environment: EntryTestEnvironment) => void = () => undefined,
  options: EntryTestEnvironmentOptions = { tags: TEST_TAGS },
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment(options);
  await environment.tagStore.getState().load();
  prepare(environment);
  render(<NewEntryTrigger />, { wrapper: environment.Providers });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "新建条目" }));
  await user.click(await screen.findByRole("button", { name: "通用登录" }));
  await screen.findByRole("dialog", { name: "新建条目" });
  return environment;
}

/**
 * 取表单里的标签输入框.
 * @returns 标签输入框元素.
 */
function tagInput(): HTMLElement {
  return screen.getByRole("combobox", { name: "标签" });
}

describe("新建条目表单里的标签", () => {
  it("默认没有已选标签, 输入框有占位文字, 下拉里是全部标签", async () => {
    await openNewLoginForm();
    const user = userEvent.setup();

    expect(tagInput().getAttribute("placeholder")).toBe("选择标签");
    await user.click(tagInput());

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "重要",
      "工作",
      "个人",
    ]);
  });

  it("侧栏选中了标签时, 默认就带上它们, 显示为带移除按钮的徽章", async () => {
    await openNewLoginForm((environment) => {
      environment.entryStore.getState().toggleTag("work-tag");
      environment.entryStore.getState().toggleTag("important");
    });

    expect(screen.getByRole("button", { name: "移除标签 工作" })).toBeDefined();
    expect(screen.getByRole("button", { name: "移除标签 重要" })).toBeDefined();
  });

  it("没有任何标签时提示先到左侧栏新建", async () => {
    await openNewLoginForm(undefined, { tags: [] });

    expect(screen.getByText("还没有标签. 可以先在左侧栏新建.")).toBeDefined();
  });

  it("输入文字过滤已有标签, 没有匹配时显示提示", async () => {
    await openNewLoginForm();
    const user = userEvent.setup();

    await user.type(tagInput(), "工");
    expect(
      (await screen.findAllByRole("option")).map(
        (option) => option.textContent,
      ),
    ).toEqual(["工作"]);

    await user.clear(tagInput());
    await user.type(tagInput(), "不存在");
    expect(await screen.findByText("没有匹配的标签")).toBeDefined();
  });
});

describe("新建条目时保存标签", () => {
  it("选了两个标签后保存, 新建输入按选择顺序带上标签, 条目带着它们出现", async () => {
    const environment = await openNewLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "新条目");
    await user.click(tagInput());
    await user.click(await screen.findByRole("option", { name: "个人" }));
    await user.click(await screen.findByRole("option", { name: "重要" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(environment.entryBridge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "新条目",
        tagIds: ["personal-tag", "important"],
      }),
    );
    expect(environment.entryStore.getState().entries[0]?.tagIds).toEqual([
      "personal-tag",
      "important",
    ]);
  });
});

describe("新建条目时移除标签与失败", () => {
  it("移除已选的标签后保存, 新建输入里没有它", async () => {
    const environment = await openNewLoginForm((prepared) => {
      prepared.entryStore.getState().toggleTag("work-tag");
      prepared.entryStore.getState().toggleTag("important");
    });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "新条目");
    await user.click(screen.getByRole("button", { name: "移除标签 工作" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(environment.entryBridge.create).toHaveBeenCalledWith(
        expect.objectContaining({ tagIds: ["important"] }),
      );
    });
    expect(environment.entryStore.getState().selectedTagIds).toEqual([
      "important",
    ]);
  });

  it("所选标签已不存在时保存失败, 提示重新选择", async () => {
    const environment = await openNewLoginForm();
    environment.entryBridge.create = () =>
      Promise.resolve({ ok: false, reason: "tag-not-found" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "新条目");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("所选标签已不存在. 请重新选择."),
    ).toBeDefined();
  });
});

describe("新建条目时标签数量上限", () => {
  it("已选满上限后, 没选中的标签在下拉里禁用", async () => {
    const manyTags: TagSummary[] = Array.from(
      { length: MAX_TAGS_PER_ENTRY + 1 },
      (_, index) => ({ id: `t-${index}`, name: `标签${index}`, color: "red" }),
    );
    await openNewLoginForm(
      (environment) => {
        manyTags
          .slice(0, MAX_TAGS_PER_ENTRY)
          .forEach((tag) =>
            environment.entryStore.getState().toggleTag(tag.id),
          );
      },
      { tags: manyTags },
    );
    const user = userEvent.setup();

    await user.click(tagInput());

    const last = await screen.findByRole("option", {
      name: `标签${MAX_TAGS_PER_ENTRY}`,
    });
    expect(last.getAttribute("aria-disabled")).toBe("true");
    const first = within(screen.getByRole("listbox")).getByRole("option", {
      name: "标签0",
    });
    expect(first.getAttribute("aria-disabled")).not.toBe("true");
  });
});
