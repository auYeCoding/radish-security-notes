import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createTagBridge } from "./create-tag-bridge";

describe("createTagBridge", () => {
  it("list 调用列表通道并返回结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: [] }));

    const result = await createTagBridge({ invoke }).list();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.tagsList);
    expect(result).toEqual({ ok: true, value: [] });
  });

  it("create 与 update 调用对应通道并带上参数", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));
    const bridge = createTagBridge({ invoke });

    await bridge.create("工作", "red");
    await bridge.update("t-1", "家庭", "blue");

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.tagsCreate,
      "工作",
      "red",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.tagsUpdate,
      "t-1",
      "家庭",
      "blue",
    );
  });

  it("remove 调用删除通道并带上编号", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));

    const result = await createTagBridge({ invoke }).remove("t-1");

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.tagsRemove, "t-1");
    expect(result).toEqual({ ok: true });
  });
});
