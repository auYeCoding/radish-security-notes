import { describe, expect, it } from "vitest";

import { folderFailed } from "@shared/folders/folder-result";

import { createFakeFolderBridge } from "@renderer/testing/fake-folder-bridge";

import { createFolderStore } from "./folder-store";

/**
 * 测试用的两个文件夹.
 */
const INITIAL_FOLDERS = [
  { id: "work", name: "工作" },
  { id: "home", name: "家庭" },
];

describe("文件夹 store 读取", () => {
  it("初始状态是读取中, 没有文件夹", () => {
    const store = createFolderStore({ bridge: createFakeFolderBridge() });

    expect(store.getState()).toMatchObject({
      folders: [],
      loadStatus: "loading",
    });
  });

  it("读取后列出全部文件夹, 先创建的在前", async () => {
    const store = createFolderStore({
      bridge: createFakeFolderBridge(INITIAL_FOLDERS),
    });

    await store.getState().load();

    expect(store.getState().loadStatus).toBe("ready");
    expect(store.getState().folders).toEqual(INITIAL_FOLDERS);
  });

  it("读取失败或抛出错误时标记失败", async () => {
    const failing = createFolderStore({
      bridge: createFakeFolderBridge([], {
        list: () => Promise.resolve(folderFailed("vault-locked")),
      }),
    });
    const throwing = createFolderStore({
      bridge: createFakeFolderBridge([], {
        list: () => Promise.reject(new Error("ipc")),
      }),
    });

    await failing.getState().load();
    await throwing.getState().load();

    expect(failing.getState().loadStatus).toBe("failed");
    expect(throwing.getState().loadStatus).toBe("failed");
  });
});

describe("文件夹 store 新建", () => {
  it("新建成功后追加到列表末尾, 名称去首尾空格", async () => {
    const store = createFolderStore({
      bridge: createFakeFolderBridge(INITIAL_FOLDERS),
    });
    await store.getState().load();

    const result = await store.getState().create("  学习 ");

    expect(result).toEqual({
      ok: true,
      value: { id: "created-folder-1", name: "学习" },
    });
    expect(store.getState().folders.map((folder) => folder.name)).toEqual([
      "工作",
      "家庭",
      "学习",
    ]);
  });

  it("新建失败时列表不变, 重名与名称不合规带着原因", async () => {
    const store = createFolderStore({
      bridge: createFakeFolderBridge(INITIAL_FOLDERS),
    });
    await store.getState().load();

    const taken = await store.getState().create("工作");
    const blank = await store.getState().create("   ");

    expect(taken).toEqual({ ok: false, reason: "name-taken" });
    expect(blank).toEqual({ ok: false, reason: "invalid-input" });
    expect(store.getState().folders).toEqual(INITIAL_FOLDERS);
  });

  it("接口抛出错误时新建与重命名都返回意外错误", async () => {
    const store = createFolderStore({
      bridge: createFakeFolderBridge([], {
        create: () => Promise.reject(new Error("ipc")),
        rename: () => Promise.reject(new Error("ipc")),
      }),
    });

    expect(await store.getState().create("甲")).toEqual({
      ok: false,
      reason: "unexpected-error",
    });
    expect(await store.getState().rename("work", "乙")).toEqual({
      ok: false,
      reason: "unexpected-error",
    });
  });
});

describe("文件夹 store 重命名", () => {
  it("重命名成功后列表里该文件夹原位换成新名称, 失败时不变", async () => {
    const store = createFolderStore({
      bridge: createFakeFolderBridge(INITIAL_FOLDERS),
    });
    await store.getState().load();

    const renamed = await store.getState().rename("work", "公司");
    const taken = await store.getState().rename("home", "公司");
    const missing = await store.getState().rename("missing", "新");

    expect(renamed.ok).toBe(true);
    expect(taken).toEqual({ ok: false, reason: "name-taken" });
    expect(missing).toEqual({ ok: false, reason: "not-found" });
    expect(store.getState().folders).toEqual([
      { id: "work", name: "公司" },
      { id: "home", name: "家庭" },
    ]);
  });
});

describe("文件夹 store 删除与放入条目", () => {
  it("删除成功后从列表移除, 没有这个编号时列表不变", async () => {
    const store = createFolderStore({
      bridge: createFakeFolderBridge(INITIAL_FOLDERS),
    });
    await store.getState().load();

    const removed = await store.getState().remove("work");
    const missing = await store.getState().remove("work");

    expect(removed).toEqual({ ok: true, value: undefined });
    expect(missing).toEqual({ ok: false, reason: "not-found" });
    expect(store.getState().folders).toEqual([{ id: "home", name: "家庭" }]);
  });

  it("接口抛出错误时删除返回意外错误, 列表不变", async () => {
    const store = createFolderStore({
      bridge: createFakeFolderBridge(INITIAL_FOLDERS, {
        remove: () => Promise.reject(new Error("ipc")),
      }),
    });
    await store.getState().load();

    const result = await store.getState().remove("work");

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(store.getState().folders).toEqual(INITIAL_FOLDERS);
  });

  it("放入条目把条目与文件夹编号交给桥, 抛出错误时返回意外错误", async () => {
    const bridge = createFakeFolderBridge(INITIAL_FOLDERS);
    const store = createFolderStore({ bridge });
    const throwing = createFolderStore({
      bridge: createFakeFolderBridge([], {
        assignEntry: () => Promise.reject(new Error("ipc")),
      }),
    });

    const assigned = await store.getState().assignEntry("e-1", "work");
    const cleared = await store.getState().assignEntry("e-1", undefined);
    const failed = await throwing.getState().assignEntry("e-1", "work");

    expect(assigned.ok && cleared.ok).toBe(true);
    expect(bridge.assignEntry).toHaveBeenNthCalledWith(1, "e-1", "work");
    expect(bridge.assignEntry).toHaveBeenNthCalledWith(2, "e-1", undefined);
    expect(failed).toEqual({ ok: false, reason: "unexpected-error" });
  });
});
