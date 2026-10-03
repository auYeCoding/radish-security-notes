import { describe, expect, it } from "vitest";

import { tagFailed } from "@shared/tags/tag-result";

import { createFakeTagBridge } from "@renderer/testing/fake-tag-bridge";
import { IMPORTANT_TAG, WORK_TAG } from "@renderer/testing/tag-fixtures";

import { createTagStore } from "./tag-store";

/**
 * 测试用的两个标签.
 */
const INITIAL_TAGS = [IMPORTANT_TAG, WORK_TAG];

describe("标签 store 读取", () => {
  it("初始状态是读取中, 没有标签", () => {
    const store = createTagStore({ bridge: createFakeTagBridge() });

    expect(store.getState()).toMatchObject({ tags: [], loadStatus: "loading" });
  });

  it("读取后列出全部标签, 先创建的在前", async () => {
    const store = createTagStore({
      bridge: createFakeTagBridge(INITIAL_TAGS),
    });

    await store.getState().load();

    expect(store.getState().loadStatus).toBe("ready");
    expect(store.getState().tags).toEqual(INITIAL_TAGS);
  });

  it("读取失败或抛出错误时标记失败", async () => {
    const failing = createTagStore({
      bridge: createFakeTagBridge([], {
        list: () => Promise.resolve(tagFailed("vault-locked")),
      }),
    });
    const throwing = createTagStore({
      bridge: createFakeTagBridge([], {
        list: () => Promise.reject(new Error("ipc")),
      }),
    });

    await failing.getState().load();
    await throwing.getState().load();

    expect(failing.getState().loadStatus).toBe("failed");
    expect(throwing.getState().loadStatus).toBe("failed");
  });
});

describe("标签 store 新建", () => {
  it("新建成功后追加到列表末尾, 名称去首尾空格, 带上颜色", async () => {
    const store = createTagStore({
      bridge: createFakeTagBridge(INITIAL_TAGS),
    });
    await store.getState().load();

    const result = await store.getState().create("  学习 ", "green");

    expect(result).toEqual({
      ok: true,
      value: { id: "created-tag-1", name: "学习", color: "green" },
    });
    expect(store.getState().tags.map((tag) => tag.name)).toEqual([
      "重要",
      "工作",
      "学习",
    ]);
  });

  it("新建失败时列表不变, 重名与名称不合规带着原因", async () => {
    const store = createTagStore({
      bridge: createFakeTagBridge(INITIAL_TAGS),
    });
    await store.getState().load();

    const taken = await store.getState().create("工作", "red");
    const invalid = await store.getState().create("   ", "red");

    expect(taken).toEqual({ ok: false, reason: "name-taken" });
    expect(invalid).toEqual({ ok: false, reason: "invalid-input" });
    expect(store.getState().tags).toEqual(INITIAL_TAGS);
  });

  it("接口抛出错误时返回意外错误, 列表不变", async () => {
    const store = createTagStore({
      bridge: createFakeTagBridge(INITIAL_TAGS, {
        create: () => Promise.reject(new Error("ipc")),
      }),
    });
    await store.getState().load();

    const result = await store.getState().create("学习", "red");

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(store.getState().tags).toEqual(INITIAL_TAGS);
  });
});

describe("标签 store 编辑与删除", () => {
  it("编辑成功后列表里该标签原位换成新名称与颜色", async () => {
    const store = createTagStore({
      bridge: createFakeTagBridge(INITIAL_TAGS),
    });
    await store.getState().load();

    const result = await store
      .getState()
      .update("important", " 紧急 ", "amber");

    expect(result).toEqual({
      ok: true,
      value: { id: "important", name: "紧急", color: "amber" },
    });
    expect(store.getState().tags).toEqual([
      { id: "important", name: "紧急", color: "amber" },
      WORK_TAG,
    ]);
  });

  it("编辑成别的标签的名称时失败, 列表不变", async () => {
    const store = createTagStore({
      bridge: createFakeTagBridge(INITIAL_TAGS),
    });
    await store.getState().load();

    const result = await store.getState().update("important", "工作", "red");

    expect(result).toEqual({ ok: false, reason: "name-taken" });
    expect(store.getState().tags).toEqual(INITIAL_TAGS);
  });

  it("删除成功后从列表移除, 失败时列表不变", async () => {
    const store = createTagStore({
      bridge: createFakeTagBridge(INITIAL_TAGS),
    });
    await store.getState().load();

    const removed = await store.getState().remove("important");
    const missing = await store.getState().remove("missing");

    expect(removed).toEqual({ ok: true, value: undefined });
    expect(missing).toEqual({ ok: false, reason: "not-found" });
    expect(store.getState().tags).toEqual([WORK_TAG]);
  });
});
