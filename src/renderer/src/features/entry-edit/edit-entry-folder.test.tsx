import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";
import { folderViewOf } from "@shared/folders/folder-view";

import { FORUM_ENTRY } from "@renderer/testing/entry-fixtures";
import { renderOpenedEditEntryDialog } from "@renderer/testing/render-edit-entry-dialog";

import { EditEntryTrigger } from "./edit-entry-trigger";

/**
 * 工作文件夹与家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "work", name: "工作" },
  { id: "home", name: "家庭" },
];

/**
 * 在工作文件夹里的论坛条目.
 */
const WORK_FORUM: EntryDetail = { ...FORUM_ENTRY, folderId: "work" };

describe("编辑条目表单里的所属文件夹", () => {
  it("预选条目现在所属的文件夹, 未分类的条目预选未分类", async () => {
    await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      WORK_FORUM,
      { folders: FOLDERS },
    );

    expect(
      screen.getByRole("combobox", { name: "所属文件夹" }).textContent,
    ).toContain("工作");
  });

  it("未分类的条目预选未分类", async () => {
    await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      FORUM_ENTRY,
      { folders: FOLDERS },
    );

    expect(
      screen.getByRole("combobox", { name: "所属文件夹" }).textContent,
    ).toContain("未分类");
  });
});

describe("编辑条目时改到另一个文件夹", () => {
  it("改到另一个文件夹后保存, 更新输入带新所属, 详情随之更新", async () => {
    const environment = await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      WORK_FORUM,
      { folders: FOLDERS },
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "所属文件夹" }));
    await user.click(await screen.findByRole("option", { name: "家庭" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(environment.entryBridge.update).toHaveBeenCalledWith(
      "forum",
      expect.objectContaining({ folderId: "home" }),
    );
    expect(environment.entryStore.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "forum", folderId: "home" },
    });
  });

  it("入口是原来的文件夹时, 条目改走后入口跟随到新文件夹", async () => {
    const environment = await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      WORK_FORUM,
      { folders: FOLDERS },
    );
    environment.entryStore.getState().selectView(folderViewOf("work"));
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "所属文件夹" }));
    await user.click(await screen.findByRole("option", { name: "家庭" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(environment.entryStore.getState().view).toEqual(
        folderViewOf("home"),
      );
    });
    expect(environment.entryStore.getState().selection).toMatchObject({
      status: "ready",
    });
  });
});

describe("编辑条目时改回未分类与失败", () => {
  it("改回未分类后保存, 更新输入不带所属", async () => {
    const environment = await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      WORK_FORUM,
      { folders: FOLDERS },
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "所属文件夹" }));
    await user.click(await screen.findByRole("option", { name: "未分类" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(environment.entryBridge.update).toHaveBeenCalledTimes(1);
    });
    const [, input] =
      vi.mocked(environment.entryBridge.update).mock.calls[0] ?? [];
    expect(input?.folderId).toBeUndefined();
  });

  it("所选文件夹已不存在时保存失败, 提示重新选择, 对话框保持打开", async () => {
    const environment = await renderOpenedEditEntryDialog(
      (detail) => <EditEntryTrigger detail={detail} />,
      WORK_FORUM,
      { folders: FOLDERS },
    );
    environment.entryBridge.update = () =>
      Promise.resolve({ ok: false, reason: "folder-not-found" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("所选文件夹已不存在. 请重新选择."),
    ).toBeDefined();
    expect(screen.getByRole("dialog", { name: "编辑条目" })).toBeDefined();
  });
});
