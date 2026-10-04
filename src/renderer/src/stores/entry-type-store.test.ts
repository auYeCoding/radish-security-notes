import { describe, expect, it } from "vitest";

import { customEntryTypeFailed } from "@shared/entries/custom-types/custom-entry-type-result";
import type { NewCustomEntryTypeInput } from "@shared/entries/custom-types/custom-entry-type-types";
import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { createFakeEntryTypeBridge } from "@renderer/testing/fake-entry-type-bridge";

import { createEntryTypeStore } from "./entry-type-store";

/**
 * 测试用的新建输入: 只有一个单行字段.
 */
const NEW_INPUT: NewCustomEntryTypeInput = {
  name: "交换机",
  fields: [
    { name: "地址", kind: "singleLine", isSensitive: false, isSummary: true },
  ],
};

describe("自定义类型 store 读取", () => {
  it("初始状态是读取中, 没有自定义类型", () => {
    const store = createEntryTypeStore({ bridge: createFakeEntryTypeBridge() });

    expect(store.getState()).toMatchObject({
      customTypes: [],
      loadStatus: "loading",
    });
  });

  it("读取后列出全部自定义类型, 先创建的在前", async () => {
    const store = createEntryTypeStore({
      bridge: createFakeEntryTypeBridge([ROUTER_TYPE]),
    });

    await store.getState().load();

    expect(store.getState().loadStatus).toBe("ready");
    expect(store.getState().customTypes).toEqual([ROUTER_TYPE]);
  });

  it("读取失败或抛出错误时标记失败", async () => {
    const failing = createEntryTypeStore({
      bridge: createFakeEntryTypeBridge([], {
        list: () => Promise.resolve(customEntryTypeFailed("vault-locked")),
      }),
    });
    const throwing = createEntryTypeStore({
      bridge: createFakeEntryTypeBridge([], {
        list: () => Promise.reject(new Error("ipc")),
      }),
    });

    await failing.getState().load();
    await throwing.getState().load();

    expect(failing.getState().loadStatus).toBe("failed");
    expect(throwing.getState().loadStatus).toBe("failed");
  });
});

describe("自定义类型 store 新建", () => {
  it("新建成功后追加到列表末尾", async () => {
    const store = createEntryTypeStore({
      bridge: createFakeEntryTypeBridge([ROUTER_TYPE]),
    });
    await store.getState().load();

    const result = await store.getState().create(NEW_INPUT);

    expect(result.ok && result.value.name).toBe("交换机");
    expect(store.getState().customTypes.map((type) => type.name)).toEqual([
      "路由器",
      "交换机",
    ]);
  });

  it("新建失败时列表不变, 失败原因原样返回", async () => {
    const store = createEntryTypeStore({
      bridge: createFakeEntryTypeBridge([ROUTER_TYPE]),
    });
    await store.getState().load();

    const result = await store
      .getState()
      .create({ ...NEW_INPUT, name: "路由器" });

    expect(result).toEqual({ ok: false, reason: "name-taken" });
    expect(store.getState().customTypes).toEqual([ROUTER_TYPE]);
  });

  it("接口调用抛出错误时返回意外错误, 列表不变", async () => {
    const store = createEntryTypeStore({
      bridge: createFakeEntryTypeBridge([], {
        create: () => Promise.reject(new Error("ipc")),
      }),
    });

    const result = await store.getState().create(NEW_INPUT);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(store.getState().customTypes).toEqual([]);
  });
});
