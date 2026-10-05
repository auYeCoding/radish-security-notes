import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createExportBridge } from "./create-export-bridge";

describe("createExportBridge", () => {
  it("describeScope 与 run 调用对应通道, 只带范围与请求, 返回主进程的结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: "x" }));
    const bridge = createExportBridge({ invoke });
    const request = {
      format: "native",
      scope: { kind: "all" },
      includeSecrets: true,
      includeAttachments: true,
      hasAcknowledgedPlaintextRisk: true,
    } as const;
    const described = await bridge.describeScope({ kind: "all" });
    const run = await bridge.run(request);
    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.exportDescribeScope,
      { kind: "all" },
    );
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.exportRun, request);
    expect(described).toEqual({ ok: true, value: "x" });
    expect(run).toEqual({ ok: true, value: "x" });
  });

  it("getProgress, cancel, revealFile 调用对应通道", async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({ stage: "idle", processed: 0, total: 0 }),
    );
    const bridge = createExportBridge({ invoke });
    const progress = await bridge.getProgress();
    await bridge.cancel();
    await bridge.revealFile();
    expect(progress).toEqual({ stage: "idle", processed: 0, total: 0 });
    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.exportProgress);
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.exportCancel);
    expect(invoke).toHaveBeenNthCalledWith(3, IPC_CHANNELS.exportRevealFile);
  });

  it("桥上只有五个方法, 没有任何传入或返回文件路径的方法", () => {
    const bridge = createExportBridge({ invoke: vi.fn() });
    expect(Object.keys(bridge).sort()).toEqual([
      "cancel",
      "describeScope",
      "getProgress",
      "revealFile",
      "run",
    ]);
    expect(bridge.run.length).toBe(1);
  });
});
