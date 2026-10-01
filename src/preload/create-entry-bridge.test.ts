import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createEntryBridge } from "./create-entry-bridge";

describe("createEntryBridge 读取与新建", () => {
  it("list 调用列表通道并返回结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: [] }));

    const result = await createEntryBridge({ invoke }).list();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.entriesList);
    expect(result).toEqual({ ok: true, value: [] });
  });

  it("get 调用详情通道并带上编号", async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({ ok: false, reason: "not-found" }),
    );

    const result = await createEntryBridge({ invoke }).get("id-1");

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.entriesGet, "id-1");
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("create 调用新建通道并带上输入", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));
    const input = {
      type: "bankCard" as const,
      name: "n",
      fields: { cardNumber: "6222" },
      notes: "第一行\n第二行",
      customFields: [{ label: "助记词", value: "a b", isHidden: true }],
    };

    await createEntryBridge({ invoke }).create(input);

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.entriesCreate, input);
  });
});

describe("createEntryBridge 复制", () => {
  it("copyField 调用复制通道并带上编号与字段名", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));

    await createEntryBridge({ invoke }).copyField("id-1", "cardNumber");

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.entriesCopyField,
      "id-1",
      "cardNumber",
    );
  });

  it("copyCustomField 调用复制自定义字段通道并带上条目编号与字段编号", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));

    const result = await createEntryBridge({ invoke }).copyCustomField(
      "id-1",
      "id-2",
    );

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.entriesCopyCustomField,
      "id-1",
      "id-2",
    );
    expect(result).toEqual({ ok: true });
  });
});
