import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";

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

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 工作文件夹与家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "work", name: "工作" },
  { id: "home", name: "家庭" },
];

/**
 * 论坛与银行在工作文件夹里, 维基没有所属文件夹.
 */
const FILED_ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "work" },
  { ...BANK_ENTRY, folderId: "work" },
  WIKI_ENTRY,
];

/**
 * 在条目环境里渲染解锁后的工作区, 等条目与文件夹读取完成.
 * @param options 条目环境的选项, 默认带两个文件夹与三个条目.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: FILED_ENTRIES,
    folders: FOLDERS,
    ...options,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
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
 * 打开文件夹行尾的更多菜单, 点其中一项.
 * @param folderName 文件夹名称.
 * @param itemName 菜单项名称.
 */
async function chooseFolderAction(
  folderName: string,
  itemName: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: `${folderName} 的更多操作` }),
  );
  await user.click(await screen.findByRole("menuitem", { name: itemName }));
}

describe("新建文件夹与校验", () => {
  it("填写名称后创建, 新文件夹出现在侧栏并追加到 store 列表末尾, 条目数为 0", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建文件夹" }));
    const dialog = await screen.findByRole("dialog", { name: "新建文件夹" });
    await user.type(within(dialog).getByLabelText("名称"), "  学习  ");
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(navButton("学习", 0)).toBeDefined();
    expect(
      environment.folderStore.getState().folders.map((folder) => folder.name),
    ).toEqual(["工作", "家庭", "学习"]);
  });

  it("名称为空时提示请填写名称, 不创建", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建文件夹" }));
    const dialog = await screen.findByRole("dialog", { name: "新建文件夹" });
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    expect(await within(dialog).findByText("请填写名称.")).toBeDefined();
    expect(environment.folderBridge.create).not.toHaveBeenCalled();
  });

  it("名称超过 50 个字符时提示, 不创建", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建文件夹" }));
    const dialog = await screen.findByRole("dialog", { name: "新建文件夹" });
    await user.type(within(dialog).getByLabelText("名称"), "长".repeat(51));
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    expect(
      await within(dialog).findByText("名称最多 50 个字符."),
    ).toBeDefined();
    expect(environment.folderBridge.create).not.toHaveBeenCalled();
  });
});

describe("新建文件夹时重名与取消", () => {
  it("与已有文件夹重名时对话框保持打开并提示, 改名后可以创建", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "新建文件夹" }));
    const dialog = await screen.findByRole("dialog", { name: "新建文件夹" });
    await user.type(within(dialog).getByLabelText("名称"), "工作");
    await user.click(within(dialog).getByRole("button", { name: "创建" }));

    expect(
      await within(dialog).findByText("已有同名文件夹, 请换一个名称."),
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

    await user.click(screen.getByRole("button", { name: "新建文件夹" }));
    const dialog = await screen.findByRole("dialog", { name: "新建文件夹" });
    await user.click(within(dialog).getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(environment.folderBridge.create).not.toHaveBeenCalled();
  });
});

describe("重命名文件夹", () => {
  it("输入框预填现在的名称, 保存后列表里是新名称, 条目数不变", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await chooseFolderAction("工作", "重命名");
    const dialog = await screen.findByRole("dialog", { name: "重命名文件夹" });
    const input = within(dialog).getByLabelText("名称");
    expect((input as HTMLInputElement).value).toBe("工作");
    await user.clear(input);
    await user.type(input, "公司");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(navButton("公司", 2)).toBeDefined();
    expect(screen.queryByRole("button", { name: /^工作\s*2$/ })).toBeNull();
  });

  it("改成别的文件夹的名称时提示重名, 列表不变", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await chooseFolderAction("工作", "重命名");
    const dialog = await screen.findByRole("dialog", { name: "重命名文件夹" });
    const input = within(dialog).getByLabelText("名称");
    await user.clear(input);
    await user.type(input, "家庭");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    expect(
      await within(dialog).findByText("已有同名文件夹, 请换一个名称."),
    ).toBeDefined();
    expect(environment.folderStore.getState().folders).toEqual(FOLDERS);
  });
});

describe("删除文件夹", () => {
  it("确认框写明其中的条目数与变为无文件夹, 确认后文件夹消失, 条目仍在全部条目里", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await chooseFolderAction("工作", "删除");
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(
      '"工作" 将被删除, 其中的 2 个条目会变为无文件夹, 条目本身不会删除.',
    );
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(screen.queryByRole("button", { name: /^工作/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /未分类/ })).toBeNull();
    expect(navButton("全部条目", 3)).toBeDefined();
    expect(getEntryListItems()).toHaveLength(3);
  });

  it("空文件夹的确认框不提条目, 取消后文件夹保留", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await chooseFolderAction("家庭", "删除");
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain('"家庭" 将被删除.');
    expect(dialog.textContent).not.toContain("个条目");
    await user.click(within(dialog).getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(navButton("家庭", 0)).toBeDefined();
  });
});

describe("删除当前选中的文件夹与失败", () => {
  it("删除的正是当前选中的文件夹时回到全部条目, 列表恢复", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.click(navButton("工作", 2));
    expect(getEntryListItems()).toHaveLength(2);

    await chooseFolderAction("工作", "删除");
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(getEntryListItems()).toHaveLength(3);
    });
    expect(navButton("全部条目", 3).getAttribute("aria-current")).toBe("true");
  });

  it("删除失败时说明原因, 文件夹保留", async () => {
    const environment = await renderWorkspace({
      folderBridgeOverrides: {
        remove: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });
    const user = userEvent.setup();

    await chooseFolderAction("家庭", "删除");
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    expect(
      await within(dialog).findByText("删除失败. 请关闭应用后重试."),
    ).toBeDefined();
    expect(environment.folderStore.getState().folders).toEqual(FOLDERS);
  });
});
