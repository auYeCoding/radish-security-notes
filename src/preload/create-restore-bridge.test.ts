import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createRestoreBridge } from "./create-restore-bridge";

describe("createRestoreBridge", () => {
  it("chooseFile, submitPassphrase 与 run 调用对应通道, 返回主进程的结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: "x" }));
    const bridge = createRestoreBridge({ invoke });

    const chosen = await bridge.chooseFile();
    const ready = await bridge.submitPassphrase("phrase");
    const run = await bridge.run({
      acknowledgesReplace: true,
      masterPassword: "master",
    });

    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.restoreChooseFile);
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.restoreSubmitPassphrase,
      "phrase",
    );
    expect(invoke).toHaveBeenNthCalledWith(3, IPC_CHANNELS.restoreRun, {
      acknowledgesReplace: true,
      masterPassword: "master",
    });
    expect(chosen).toEqual({ ok: true, value: "x" });
    expect(ready).toEqual({ ok: true, value: "x" });
    expect(run).toEqual({ ok: true, value: "x" });
  });

  it("getProgress 与 cancel 调用对应通道", async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({ stage: "idle", processed: 0, total: 0 }),
    );
    const bridge = createRestoreBridge({ invoke });

    const progress = await bridge.getProgress();
    await bridge.cancel();

    expect(progress).toEqual({ stage: "idle", processed: 0, total: 0 });
    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.restoreProgress);
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.restoreCancel);
  });

  it("桥上没有任何传入文件路径的方法, 选择文件不带参数", () => {
    const bridge = createRestoreBridge({ invoke: vi.fn() });

    expect(Object.keys(bridge).sort()).toEqual([
      "cancel",
      "chooseFile",
      "getProgress",
      "run",
      "submitPassphrase",
    ]);
    expect(bridge.chooseFile.length).toBe(0);
  });
});
