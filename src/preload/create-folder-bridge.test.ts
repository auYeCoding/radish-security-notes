import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createFolderBridge } from "./create-folder-bridge";

describe("createFolderBridge", () => {
  it("list 调用列表通道并返回结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: [] }));

    const result = await createFolderBridge({ invoke }).list();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.foldersList);
    expect(result).toEqual({ ok: true, value: [] });
  });

  it("create 与 rename 调用对应通道并带上参数", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));
    const bridge = createFolderBridge({ invoke });

    await bridge.create("工作");
    await bridge.rename("f-1", "家庭");

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.foldersCreate,
      "工作",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.foldersRename,
      "f-1",
      "家庭",
    );
  });

  it("remove 调用删除通道并带上编号", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));

    const result = await createFolderBridge({ invoke }).remove("f-1");

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.foldersRemove, "f-1");
    expect(result).toEqual({ ok: true });
  });

  it("assignEntry 调用放入通道并带上条目与文件夹编号, 移出时文件夹编号为 undefined", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));
    const bridge = createFolderBridge({ invoke });

    await bridge.assignEntry("e-1", "f-1");
    await bridge.assignEntry("e-1", undefined);

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.foldersAssignEntry,
      "e-1",
      "f-1",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.foldersAssignEntry,
      "e-1",
      undefined,
    );
  });
});
