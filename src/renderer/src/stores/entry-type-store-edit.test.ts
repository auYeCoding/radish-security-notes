import { describe, expect, it } from "vitest";

import type { UpdateCustomEntryTypeInput } from "@shared/entries/custom-types/custom-entry-type-edit-types";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";
import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

import { ROUTER_ENTRY } from "@renderer/testing/custom-type-fixtures";
import { createFakeEntryTypeBridge } from "@renderer/testing/fake-entry-type-bridge";

import { createEntryTypeStore } from "./entry-type-store";

/**
 * 另一个自定义类型, 用来检查修改与删除不影响其它类型.
 */
const SWITCH_TYPE: CustomEntryType = {
  id: "switch",
  key: "custom:switch",
  name: "交换机",
  fields: [
    { key: "account", name: "地址", kind: "singleLine", isSensitive: false },
  ],
};

/**
 * 原样提交路由器类型的修改输入, 可以覆盖其中的取值.
 * @param overrides 要覆盖的取值.
 * @returns 修改输入.
 */
function updateInputOf(
  overrides: Partial<UpdateCustomEntryTypeInput> = {},
): UpdateCustomEntryTypeInput {
  return {
    id: ROUTER_TYPE.id,
    name: ROUTER_TYPE.name,
    fields: ROUTER_TYPE.fields.map((field) => ({
      ...field,
      isSummary: field.key === "account",
    })),
    isImpactConfirmed: false,
    ...overrides,
  };
}

/**
 * 创建并读取好两个自定义类型的 store.
 * @param entries 假桥里与类型共享的条目.
 * @returns store 与假桥.
 */
async function createLoadedStore(
  entries: Parameters<typeof createFakeEntryTypeBridge>[3] = [],
): Promise<ReturnType<typeof createEntryTypeStore>> {
  const store = createEntryTypeStore({
    bridge: createFakeEntryTypeBridge(
      [ROUTER_TYPE, SWITCH_TYPE],
      {},
      undefined,
      entries,
    ),
  });
  await store.getState().load();
  return store;
}

describe("自定义类型 store 修改", () => {
  it("修改成功后列表里的这个类型换成修改后的, 位置与其它类型不变", async () => {
    const store = await createLoadedStore();

    const result = await store
      .getState()
      .update(updateInputOf({ name: "家用路由器" }));

    expect(result.ok && result.value.name).toBe("家用路由器");
    expect(store.getState().customTypes.map((type) => type.name)).toEqual([
      "家用路由器",
      "交换机",
    ]);
    expect(store.getState().customTypes[1]).toEqual(SWITCH_TYPE);
  });

  it("修改失败时列表不变, 失败原因原样返回", async () => {
    const store = await createLoadedStore();

    const result = await store
      .getState()
      .update(updateInputOf({ name: "交换机" }));

    expect(result).toEqual({ ok: false, reason: "name-taken" });
    expect(store.getState().customTypes).toEqual([ROUTER_TYPE, SWITCH_TYPE]);
  });

  it("删除有取值的字段而没有确认时是 confirmation-required, 带确认标记才成功", async () => {
    const store = await createLoadedStore([ROUTER_ENTRY]);
    const fields = updateInputOf().fields.filter(
      (field) => field.key !== "field-pass",
    );

    const refused = await store.getState().update(updateInputOf({ fields }));
    const accepted = await store
      .getState()
      .update(updateInputOf({ fields, isImpactConfirmed: true }));

    expect(refused).toEqual({ ok: false, reason: "confirmation-required" });
    expect(accepted.ok).toBe(true);
    expect(store.getState().customTypes[0].fields).toHaveLength(2);
  });

  it("接口调用抛出错误时返回意外错误, 列表不变", async () => {
    const store = createEntryTypeStore({
      bridge: createFakeEntryTypeBridge([ROUTER_TYPE], {
        update: () => Promise.reject(new Error("ipc")),
      }),
    });
    await store.getState().load();

    const result = await store.getState().update(updateInputOf());

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(store.getState().customTypes).toEqual([ROUTER_TYPE]);
  });
});

describe("自定义类型 store 删除", () => {
  it("删除成功后这个类型从列表里移除, 其它类型不变", async () => {
    const store = await createLoadedStore();

    const result = await store
      .getState()
      .remove({ id: ROUTER_TYPE.id, isImpactConfirmed: false });

    expect(result).toEqual({ ok: true, value: undefined });
    expect(store.getState().customTypes).toEqual([SWITCH_TYPE]);
  });

  it("类型下有条目而没有确认时是 confirmation-required, 列表不变", async () => {
    const store = await createLoadedStore([ROUTER_ENTRY]);

    const result = await store
      .getState()
      .remove({ id: ROUTER_TYPE.id, isImpactConfirmed: false });

    expect(result).toEqual({ ok: false, reason: "confirmation-required" });
    expect(store.getState().customTypes).toEqual([ROUTER_TYPE, SWITCH_TYPE]);
  });

  it("接口调用抛出错误时返回意外错误, 列表不变", async () => {
    const store = createEntryTypeStore({
      bridge: createFakeEntryTypeBridge([ROUTER_TYPE], {
        remove: () => Promise.reject(new Error("ipc")),
      }),
    });
    await store.getState().load();

    const result = await store
      .getState()
      .remove({ id: ROUTER_TYPE.id, isImpactConfirmed: true });

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(store.getState().customTypes).toEqual([ROUTER_TYPE]);
  });
});
