import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createBatchBridge } from "./create-batch-bridge";

describe("createBatchBridge", () => {
  it("removeEntries 调用批量删除通道并返回结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: undefined }));

    const result = await createBatchBridge({ invoke }).removeEntries([
      "a",
      "b",
    ]);

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.batchRemoveEntries, [
      "a",
      "b",
    ]);
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("moveEntries 带上文件夹编号, 移回未分类时带 undefined", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));
    const bridge = createBatchBridge({ invoke });

    await bridge.moveEntries(["a"], "folder-1");
    await bridge.moveEntries(["a"], undefined);

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.batchMoveEntries,
      ["a"],
      "folder-1",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.batchMoveEntries,
      ["a"],
      undefined,
    );
  });
});

describe("createBatchBridge 标签通道", () => {
  it("addTag 与 removeTag 调用对应通道并带上条目与标签编号", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: [] }));
    const bridge = createBatchBridge({ invoke });

    const added = await bridge.addTag(["a"], "tag-1");
    await bridge.removeTag(["a", "b"], "tag-2");

    expect(added).toEqual({ ok: true, value: [] });
    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.batchAddTag,
      ["a"],
      "tag-1",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.batchRemoveTag,
      ["a", "b"],
      "tag-2",
    );
  });
});
