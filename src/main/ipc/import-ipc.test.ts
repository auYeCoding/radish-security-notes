import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { ImportService } from "../import/import-service";
import { createFakeIpcMain, type FakeIpcMain } from "../testing/fake-ipc-main";
import { registerImportIpc } from "./import-ipc";

/**
 * 创建带间谍方法的假导入服务.
 * @returns 假服务.
 */
function createFakeService(): ImportService {
  return {
    chooseFile: vi.fn(async () => ({
      ok: true,
      value: { status: "cancelled" },
    })),
    run: vi.fn(() => ({ ok: true, value: {} })),
    getProgress: vi.fn(() => ({ stage: "idle", processed: 0, total: 0 })),
    cancel: vi.fn(),
    saveReport: vi.fn(async () => ({ ok: true, value: { status: "saved" } })),
    revealFile: vi.fn(() => ({ ok: true, value: undefined })),
  } as unknown as ImportService;
}

/**
 * 注册了导入 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假导入服务.
   */
  readonly service: ImportService;
}

/**
 * 注册导入 IPC 并返回假 IPC 与假服务.
 * @returns 假 IPC 与假服务.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = createFakeService();
  registerImportIpc(ipcMain, service);
  return { ipcMain, service };
}

describe("registerImportIpc 转发", () => {
  it("选择与确认通道把校验过的参数交给服务", async () => {
    const { ipcMain, service } = registerWithFakes();

    await ipcMain.invoke(IPC_CHANNELS.importChooseFile, "bitwardenJson");
    ipcMain.invoke(IPC_CHANNELS.importRun, {
      duplicatePolicy: "import",
      ignored: "x",
    });

    expect(service.chooseFile).toHaveBeenCalledWith("bitwardenJson");
    expect(service.run).toHaveBeenCalledWith({ duplicatePolicy: "import" });
  });

  it("进度, 取消, 保存清单与打开所在文件夹通道转发给服务", async () => {
    const { ipcMain, service } = registerWithFakes();

    const progress = ipcMain.invoke(IPC_CHANNELS.importProgress);
    ipcMain.invoke(IPC_CHANNELS.importCancel);
    await ipcMain.invoke(IPC_CHANNELS.importSaveReport);
    ipcMain.invoke(IPC_CHANNELS.importRevealFile);

    expect(progress).toEqual({ stage: "idle", processed: 0, total: 0 });
    expect(service.cancel).toHaveBeenCalledTimes(1);
    expect(service.saveReport).toHaveBeenCalledTimes(1);
    expect(service.revealFile).toHaveBeenCalledTimes(1);
  });
});

describe("registerImportIpc 进程边界校验", () => {
  it("来源键不是登记过的来源时抛错, 不交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.importChooseFile, "lastpassCsv"),
    ).toThrow("无效的导入参数");
    expect(() => ipcMain.invoke(IPC_CHANNELS.importChooseFile, 5)).toThrow();
    expect(service.chooseFile).not.toHaveBeenCalled();
  });

  it("确认选项不是对象或处理方式不合规时抛错, 不交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    for (const bad of [
      undefined,
      null,
      "skip",
      {},
      { duplicatePolicy: "overwrite" },
    ]) {
      expect(() => ipcMain.invoke(IPC_CHANNELS.importRun, bad)).toThrow(
        "无效的导入参数",
      );
    }
    expect(service.run).not.toHaveBeenCalled();
  });
});
