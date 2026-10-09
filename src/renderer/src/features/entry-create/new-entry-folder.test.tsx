import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { FolderSummary } from "@shared/folders/folder-types";
import { folderViewOf } from "@shared/folders/folder-view";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { NewEntryTrigger } from "./new-entry-trigger";

/**
 * 工作文件夹与家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "work", name: "工作" },
  { id: "home", name: "家庭" },
];

/**
 * 渲染新建入口, 打开对话框并点选通用登录, 等表单出现. 打开之前侧栏选中的入口由调用方设定.
 * @param prepare 在渲染前对环境做的准备, 例如切换侧栏入口.
 * @returns 渲染所用的环境.
 */
async function openNewLoginForm(
  prepare: (environment: EntryTestEnvironment) => void = () => undefined,
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({ folders: FOLDERS });
  await environment.folderStore.getState().load();
  prepare(environment);
  render(<NewEntryTrigger />, { wrapper: environment.Providers });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "新建条目" }));
  await user.click(await screen.findByRole("button", { name: "通用登录" }));
  await screen.findByRole("dialog", { name: "新建条目" });
  return environment;
}

describe("新建条目表单里的所属文件夹", () => {
  it("默认是无文件夹, 下拉里是无文件夹加全部文件夹", async () => {
    await openNewLoginForm();
    const user = userEvent.setup();

    const trigger = screen.getByRole("combobox", { name: "所属文件夹" });
    expect(trigger.textContent).toContain("无文件夹");
    await user.click(trigger);

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "无文件夹",
      "工作",
      "家庭",
    ]);
  });

  it("侧栏选中某个文件夹时, 默认所属就是它", async () => {
    await openNewLoginForm((environment) =>
      environment.entryStore.getState().selectView(folderViewOf("home")),
    );

    expect(
      screen.getByRole("combobox", { name: "所属文件夹" }).textContent,
    ).toContain("家庭");
  });
});

describe("新建条目时保存所属文件夹", () => {
  it("选了文件夹后保存, 新建输入带上所属, 条目出现在该文件夹里", async () => {
    const environment = await openNewLoginForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "新条目");
    await user.click(screen.getByRole("combobox", { name: "所属文件夹" }));
    await user.click(await screen.findByRole("option", { name: "工作" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(environment.entryBridge.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "新条目", folderId: "work" }),
    );
    expect(environment.entryStore.getState().entries[0]?.folderId).toBe("work");
    expect(environment.entryStore.getState().view).toEqual({ kind: "all" });
  });

  it("保存到的文件夹不是当前入口时, 入口跟随条目切到该文件夹", async () => {
    const environment = await openNewLoginForm((prepared) =>
      prepared.entryStore.getState().selectView(folderViewOf("home")),
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "新条目");
    await user.click(screen.getByRole("combobox", { name: "所属文件夹" }));
    await user.click(await screen.findByRole("option", { name: "工作" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(environment.entryStore.getState().view).toEqual(
        folderViewOf("work"),
      );
    });
  });
});

describe("新建条目时改回无文件夹与失败", () => {
  it("选回无文件夹后保存, 新建输入不带所属", async () => {
    const environment = await openNewLoginForm((prepared) =>
      prepared.entryStore.getState().selectView(folderViewOf("work")),
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "散件");
    await user.click(screen.getByRole("combobox", { name: "所属文件夹" }));
    await user.click(await screen.findByRole("option", { name: "无文件夹" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "保存" }),
    );

    await waitFor(() => {
      expect(environment.entryBridge.create).toHaveBeenCalledTimes(1);
    });
    const [input] =
      vi.mocked(environment.entryBridge.create).mock.calls[0] ?? [];
    expect(input?.folderId).toBeUndefined();
  });

  it("所选文件夹已不存在时保存失败, 提示重新选择", async () => {
    const environment = await openNewLoginForm();
    environment.entryBridge.create = () =>
      Promise.resolve({ ok: false, reason: "folder-not-found" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("名称"), "新条目");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("所选文件夹已不存在. 请重新选择."),
    ).toBeDefined();
  });
});
