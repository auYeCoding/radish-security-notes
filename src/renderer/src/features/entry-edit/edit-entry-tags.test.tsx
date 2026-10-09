import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";

import { FORUM_ENTRY } from "@renderer/testing/entry-fixtures";
import { renderOpenedEditEntryDialog } from "@renderer/testing/render-edit-entry-dialog";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { EditEntryTrigger } from "./edit-entry-trigger";

/**
 * 带重要与工作标签的论坛条目.
 */
const TAGGED_FORUM: EntryDetail = {
  ...FORUM_ENTRY,
  tagIds: ["important", "work-tag"],
};

describe("编辑条目表单里的标签", () => {
  it("预选条目现在带的标签, 显示为带移除按钮的徽章", async () => {
    await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      TAGGED_FORUM,
      { tags: TEST_TAGS },
    );

    expect(screen.getByRole("button", { name: "移除标签 重要" })).toBeDefined();
    expect(screen.getByRole("button", { name: "移除标签 工作" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "移除标签 个人" })).toBeNull();
  });

  it("没有标签的条目预选为空", async () => {
    await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      FORUM_ENTRY,
      { tags: TEST_TAGS },
    );

    expect(screen.queryByRole("button", { name: /^移除标签/ })).toBeNull();
    expect(
      screen
        .getByRole("combobox", { name: "标签" })
        .getAttribute("placeholder"),
    ).toBe("选择标签");
  });
});

describe("编辑条目时改标签", () => {
  it("移除一个并添加一个后保存, 更新输入带新的标签, 详情随之更新", async () => {
    const environment = await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      TAGGED_FORUM,
      { tags: TEST_TAGS },
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "移除标签 重要" }));
    await user.click(screen.getByRole("combobox", { name: "标签" }));
    await user.click(await screen.findByRole("option", { name: "个人" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(environment.entryBridge.update).toHaveBeenCalledWith(
      "forum",
      expect.objectContaining({ tagIds: ["work-tag", "personal-tag"] }),
    );
    expect(environment.entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "forum", tagIds: ["work-tag", "personal-tag"] },
    });
  });
});

describe("编辑条目时移除标签", () => {
  it("移除全部标签后保存, 更新输入里的标签为空数组", async () => {
    const environment = await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      TAGGED_FORUM,
      { tags: TEST_TAGS },
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "移除标签 重要" }));
    await user.click(screen.getByRole("button", { name: "移除标签 工作" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(environment.entryBridge.update).toHaveBeenCalledTimes(1);
    });
    const [, input] =
      vi.mocked(environment.entryBridge.update).mock.calls[0] ?? [];
    expect(input?.tagIds).toEqual([]);
  });

  it("去掉一个标签后保存, 条目保持选中, 带着剩下的标签", async () => {
    const environment = await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      TAGGED_FORUM,
      { tags: TEST_TAGS },
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "移除标签 重要" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(environment.entryStore.getState().selection).toMatchObject({
        status: "ready",
        detail: { tagIds: ["work-tag"] },
      });
    });
  });
});

describe("编辑条目时标签保存失败", () => {
  it("所选标签已不存在时保存失败, 提示重新选择, 对话框保持打开", async () => {
    const environment = await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      TAGGED_FORUM,
      { tags: TEST_TAGS },
    );
    environment.entryBridge.update = () =>
      Promise.resolve({ ok: false, reason: "tag-not-found" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("所选标签已不存在. 请重新选择."),
    ).toBeDefined();
    expect(screen.getByRole("dialog", { name: "编辑条目" })).toBeDefined();
  });
});
