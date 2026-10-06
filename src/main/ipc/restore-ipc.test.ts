import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { RestoreService } from "../restore/restore-service";
import { createFakeIpcMain, type FakeIpcMain } from "../testing/fake-ipc-main";
import { registerRestoreIpc } from "./restore-ipc";

/**
 * 创建带间谍方法的假恢复服务.
 * @returns 假服务.
 */
function createFakeService(): RestoreService {
  return {
    chooseFile: vi.fn(async () => ({
      ok: true,
      value: { status: "cancelled" },
    })),
    submitPassphrase: vi.fn(async () => ({ ok: true, value: {} })),
    run: vi.fn(async () => ({ ok: true, value: {} })),
    getProgress: vi.fn(() => ({ stage: "idle", processed: 0, total: 0 })),
    cancel: vi.fn(),
  } as unknown as RestoreService;
}

/**
 * 注册了恢复 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假恢复服务.
   */
  readonly service: RestoreService;
}

/**
 * 注册恢复 IPC 并返回假 IPC 与假服务.
 * @returns 假 IPC 与假服务.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = createFakeService();
  registerRestoreIpc(ipcMain, service);
  return { ipcMain, service };
}

describe("registerRestoreIpc 转发", () => {
  it("选择文件通道不带任何参数, 渲染端送来的东西被忽略", async () => {
    const { ipcMain, service } = registerWithFakes();

    await ipcMain.invoke(IPC_CHANNELS.restoreChooseFile, "C:\\evil.zip");

    expect(service.chooseFile).toHaveBeenCalledWith();
  });

  it("提交口令与确认通道把校验过的参数交给服务, 多余的键被丢弃", async () => {
    const { ipcMain, service } = registerWithFakes();

    await ipcMain.invoke(IPC_CHANNELS.restoreSubmitPassphrase, "phrase");
    await ipcMain.invoke(IPC_CHANNELS.restoreRun, {
      acknowledgesReplace: true,
      masterPassword: "master",
      filePath: "C:\\evil.zip",
    });
    await ipcMain.invoke(IPC_CHANNELS.restoreRun, {
      acknowledgesReplace: false,
    });

    expect(service.submitPassphrase).toHaveBeenCalledWith("phrase");
    expect(service.run).toHaveBeenNthCalledWith(1, {
      acknowledgesReplace: true,
      masterPassword: "master",
    });
    expect(service.run).toHaveBeenNthCalledWith(2, {
      acknowledgesReplace: false,
    });
  });

  it("进度与取消通道转发给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    const progress = ipcMain.invoke(IPC_CHANNELS.restoreProgress);
    ipcMain.invoke(IPC_CHANNELS.restoreCancel);

    expect(progress).toEqual({ stage: "idle", processed: 0, total: 0 });
    expect(service.cancel).toHaveBeenCalledTimes(1);
  });
});

describe("registerRestoreIpc 进程边界校验", () => {
  it("口令不是非空字符串, 或超长时抛错, 不交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    for (const bad of [undefined, null, 5, "", "x".repeat(1025)]) {
      expect(() =>
        ipcMain.invoke(IPC_CHANNELS.restoreSubmitPassphrase, bad),
      ).toThrow("无效的恢复参数");
    }
    expect(service.submitPassphrase).not.toHaveBeenCalled();
  });

  it("恢复请求不是对象, 确认不是布尔值或主密码不合规时抛错, 不交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    for (const bad of [
      undefined,
      null,
      "replace",
      {},
      { acknowledgesReplace: "yes" },
      { acknowledgesReplace: true, masterPassword: 5 },
      { acknowledgesReplace: true, masterPassword: "x".repeat(1025) },
    ]) {
      expect(() => ipcMain.invoke(IPC_CHANNELS.restoreRun, bad)).toThrow(
        "无效的恢复参数",
      );
    }
    expect(service.run).not.toHaveBeenCalled();
  });
});
