import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createImportBridge } from "./create-import-bridge";

describe("createImportBridge", () => {
  it("chooseFile 与 run 调用对应通道, 只带来源键与确认选项, 返回主进程的结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: "x" }));
    const bridge = createImportBridge({ invoke });

    const chosen = await bridge.chooseFile("bitwardenCsv");
    const run = await bridge.run({ duplicatePolicy: "skip" });

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.importChooseFile,
      "bitwardenCsv",
    );
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.importRun, {
      duplicatePolicy: "skip",
    });
    expect(chosen).toEqual({ ok: true, value: "x" });
    expect(run).toEqual({ ok: true, value: "x" });
  });

  it("getProgress, cancel, saveReport, revealFile 调用对应通道", async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({ stage: "idle", processed: 0, total: 0 }),
    );
    const bridge = createImportBridge({ invoke });

    const progress = await bridge.getProgress();
    await bridge.cancel();
    await bridge.saveReport();
    await bridge.revealFile();

    expect(progress).toEqual({ stage: "idle", processed: 0, total: 0 });
    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.importProgress);
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.importCancel);
    expect(invoke).toHaveBeenNthCalledWith(3, IPC_CHANNELS.importSaveReport);
    expect(invoke).toHaveBeenNthCalledWith(4, IPC_CHANNELS.importRevealFile);
  });

  it("桥上没有任何传入文件路径的方法", () => {
    const bridge = createImportBridge({ invoke: vi.fn() });

    expect(Object.keys(bridge).sort()).toEqual([
      "cancel",
      "chooseFile",
      "getProgress",
      "revealFile",
      "run",
      "saveReport",
    ]);
    expect(bridge.chooseFile.length).toBe(1);
  });
});
