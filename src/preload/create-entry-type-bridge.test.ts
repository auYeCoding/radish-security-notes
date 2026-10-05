import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createEntryTypeBridge } from "./create-entry-type-bridge";

describe("createEntryTypeBridge", () => {
  it("list 调用列表通道并返回结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: [] }));

    const result = await createEntryTypeBridge({ invoke }).list();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.entryTypesList);
    expect(result).toEqual({ ok: true, value: [] });
  });

  it("create 调用新建通道并带上类型输入", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: false }));
    const input = {
      name: "路由器",
      fields: [
        {
          name: "地址",
          kind: "singleLine" as const,
          isSensitive: false,
          isSummary: true,
        },
      ],
    };

    const result = await createEntryTypeBridge({ invoke }).create(input);

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.entryTypesCreate, input);
    expect(result).toEqual({ ok: false });
  });
});

describe("createEntryTypeBridge 修改与删除", () => {
  it("update 调用修改通道并带上修改输入", async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({ ok: false, reason: "confirmation-required" }),
    );
    const input = {
      id: "t-1",
      name: "路由器",
      fields: [
        {
          key: "account",
          name: "地址",
          kind: "singleLine" as const,
          isSensitive: false,
          isSummary: true,
        },
      ],
      isImpactConfirmed: false,
    };

    const result = await createEntryTypeBridge({ invoke }).update(input);

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.entryTypesUpdate, input);
    expect(result).toEqual({ ok: false, reason: "confirmation-required" });
  });

  it("remove 调用删除通道并带上删除输入", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: undefined }));
    const input = { id: "t-1", isImpactConfirmed: true };

    const result = await createEntryTypeBridge({ invoke }).remove(input);

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.entryTypesRemove, input);
    expect(result).toEqual({ ok: true, value: undefined });
  });
});
