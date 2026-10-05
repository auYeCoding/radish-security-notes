import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { ExportService } from "../export/export-service";
import { createFakeIpcMain, type FakeIpcMain } from "../testing/fake-ipc-main";
import { registerExportIpc } from "./export-ipc";

/**
 * 创建带间谍方法的假导出服务.
 * @returns 假服务.
 */
function createFakeService(): ExportService {
  return {
    describeScope: vi.fn(async () => ({ ok: true, value: {} })),
    run: vi.fn(async () => ({ ok: true, value: { status: "cancelled" } })),
    getProgress: vi.fn(() => ({ stage: "idle", processed: 0, total: 0 })),
    cancel: vi.fn(),
    revealFile: vi.fn(() => ({ ok: true, value: undefined })),
  } as unknown as ExportService;
}

/**
 * 注册了导出 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假导出服务.
   */
  readonly service: ExportService;
}

/**
 * 注册导出 IPC 并返回假 IPC 与假服务.
 * @returns 假 IPC 与假服务.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = createFakeService();
  registerExportIpc(ipcMain, service);
  return { ipcMain, service };
}

describe("registerExportIpc 转发", () => {
  it("统计范围与导出通道把校验过的参数交给服务", async () => {
    const { ipcMain, service } = registerWithFakes();
    await ipcMain.invoke(IPC_CHANNELS.exportDescribeScope, {
      kind: "entries",
      entryIds: ["a"],
      extra: 1,
    });
    await ipcMain.invoke(IPC_CHANNELS.exportRun, {
      format: "browserCsv",
      scope: { kind: "all" },
      includeSecrets: false,
      includeAttachments: false,
      hasAcknowledgedPlaintextRisk: true,
      extra: "x",
    });
    expect(service.describeScope).toHaveBeenCalledWith({
      kind: "entries",
      entryIds: ["a"],
    });
    expect(service.run).toHaveBeenCalledWith({
      format: "browserCsv",
      scope: { kind: "all" },
      includeSecrets: false,
      includeAttachments: false,
      hasAcknowledgedPlaintextRisk: true,
    });
  });

  it("进度, 取消与打开所在文件夹通道转发给服务", () => {
    const { ipcMain, service } = registerWithFakes();
    const progress = ipcMain.invoke(IPC_CHANNELS.exportProgress);
    ipcMain.invoke(IPC_CHANNELS.exportCancel);
    ipcMain.invoke(IPC_CHANNELS.exportRevealFile);
    expect(progress).toEqual({ stage: "idle", processed: 0, total: 0 });
    expect(service.cancel).toHaveBeenCalledTimes(1);
    expect(service.revealFile).toHaveBeenCalledTimes(1);
  });
});

describe("registerExportIpc 进程边界校验", () => {
  it("范围不合规时抛错, 不交给服务", () => {
    const { ipcMain, service } = registerWithFakes();
    for (const bad of [undefined, null, "all", { kind: "folder" }]) {
      expect(() =>
        ipcMain.invoke(IPC_CHANNELS.exportDescribeScope, bad),
      ).toThrow("无效的导出参数");
    }
    expect(service.describeScope).not.toHaveBeenCalled();
  });

  it("请求不合规时抛错, 不交给服务", () => {
    const { ipcMain, service } = registerWithFakes();
    for (const bad of [undefined, {}, { format: "native" }, "native"]) {
      expect(() => ipcMain.invoke(IPC_CHANNELS.exportRun, bad)).toThrow(
        "无效的导出参数",
      );
    }
    expect(service.run).not.toHaveBeenCalled();
  });
});
