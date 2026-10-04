import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createAttachmentBridge } from "./create-attachment-bridge";

/**
 * 造一个只带名称的假拖入文件.
 * @param name 文件名.
 * @returns 假文件.
 */
function fileNamed(name: string): File {
  return { name } as File;
}

/**
 * 创建桥, 假的文件路径表按文件名取路径.
 * @param invoke 假 IPC 调用.
 * @param paths 文件名到路径的表.
 * @returns 附件桥.
 */
function createBridge(
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>,
  paths: Readonly<Record<string, string>> = {},
): ReturnType<typeof createAttachmentBridge> {
  return createAttachmentBridge({
    ipcRenderer: { invoke },
    getPathForFile: (file) => paths[file.name] ?? "",
  });
}

describe("createAttachmentBridge", () => {
  it("list, saveAs, open, preview, remove 调用各自的通道并带上编号", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: undefined }));
    const bridge = createBridge(invoke);

    await bridge.list("entry-1");
    await bridge.saveAs("att-1");
    await bridge.open("att-2");
    await bridge.preview("att-3");
    await bridge.remove("att-4");

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.attachmentsList,
      "entry-1",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.attachmentsSaveAs,
      "att-1",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      3,
      IPC_CHANNELS.attachmentsOpen,
      "att-2",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      4,
      IPC_CHANNELS.attachmentsPreview,
      "att-3",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      5,
      IPC_CHANNELS.attachmentsRemove,
      "att-4",
    );
  });
});

describe("createAttachmentBridge 添加", () => {
  it("addFromDialog 调用对话框添加通道并返回主进程的结果", async () => {
    const outcome = { ok: true, value: { status: "cancelled" } };
    const invoke = vi.fn(() => Promise.resolve(outcome));

    const result = await createBridge(invoke).addFromDialog("entry-1");

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.attachmentsAddFromDialog,
      "entry-1",
    );
    expect(result).toEqual(outcome);
  });

  it("addDropped 把拖入的文件换成路径, 只有路径经 IPC 交给主进程", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));
    const bridge = createBridge(invoke, {
      "甲.txt": "C:\\files\\甲.txt",
      "乙.pem": "C:\\files\\乙.pem",
    });

    await bridge.addDropped("entry-1", [
      fileNamed("甲.txt"),
      fileNamed("乙.pem"),
    ]);

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.attachmentsAddPaths,
      "entry-1",
      ["C:\\files\\甲.txt", "C:\\files\\乙.pem"],
    );
  });
});

describe("createAttachmentBridge 拖入的拒绝", () => {
  it("addDropped 遇到不是来自磁盘的文件 (路径为空) 或没有文件时整次拒绝, 不调用主进程", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));
    const bridge = createBridge(invoke, { "甲.txt": "C:\\files\\甲.txt" });

    const mixed = await bridge.addDropped("entry-1", [
      fileNamed("甲.txt"),
      fileNamed("网页里的图片.png"),
    ]);
    const none = await bridge.addDropped("entry-1", []);

    expect(mixed).toEqual({ ok: false, reason: "invalid-input" });
    expect(none).toEqual({ ok: false, reason: "invalid-input" });
    expect(invoke).not.toHaveBeenCalled();
  });
});
