import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { BatchService } from "../batch/batch-service";
import { createFakeIpcMain, type FakeIpcMain } from "../testing/fake-ipc-main";
import { registerBatchIpc } from "./batch-ipc";

/**
 * 创建带间谍方法的假批量服务.
 * @returns 假服务.
 */
function createFakeService(): BatchService {
  return {
    removeEntries: vi.fn(() => ({ ok: true, value: undefined })),
    moveEntries: vi.fn(() => ({ ok: true, value: undefined })),
    addTag: vi.fn(() => ({ ok: true, value: [] })),
    removeTag: vi.fn(() => ({ ok: true, value: [] })),
  } as unknown as BatchService;
}

/**
 * 注册了批量 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假批量服务.
   */
  readonly service: BatchService;
}

/**
 * 注册批量 IPC 并返回假 IPC 与假服务.
 * @returns 假 IPC 与假服务.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = createFakeService();
  registerBatchIpc(ipcMain, service);
  return { ipcMain, service };
}

describe("registerBatchIpc 转发", () => {
  it("四个通道把参数交给服务并返回服务的结果", () => {
    const { ipcMain, service } = registerWithFakes();

    const removed = ipcMain.invoke(IPC_CHANNELS.batchRemoveEntries, ["a", "b"]);
    ipcMain.invoke(IPC_CHANNELS.batchMoveEntries, ["a"], "folder-1");
    ipcMain.invoke(IPC_CHANNELS.batchAddTag, ["a"], "tag-1");
    ipcMain.invoke(IPC_CHANNELS.batchRemoveTag, ["a", "b"], "tag-2");

    expect(removed).toEqual({ ok: true, value: undefined });
    expect(service.removeEntries).toHaveBeenCalledWith(["a", "b"]);
    expect(service.moveEntries).toHaveBeenCalledWith(["a"], "folder-1");
    expect(service.addTag).toHaveBeenCalledWith(["a"], "tag-1");
    expect(service.removeTag).toHaveBeenCalledWith(["a", "b"], "tag-2");
  });

  it("移回未分类时文件夹编号省略, 交给服务的是 undefined", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.batchMoveEntries, ["a"], undefined);

    expect(service.moveEntries).toHaveBeenCalledWith(["a"], undefined);
  });
});

describe("registerBatchIpc 参数校验", () => {
  it("编号列表不是由字符串组成的数组时抛出错误, 不调用服务", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() => ipcMain.invoke(IPC_CHANNELS.batchRemoveEntries, "a")).toThrow(
      "无效的批量参数",
    );
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.batchRemoveEntries, ["a", 1]),
    ).toThrow("无效的批量参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.batchMoveEntries, undefined, "folder-1"),
    ).toThrow("无效的批量参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.batchAddTag, null, "tag-1"),
    ).toThrow("无效的批量参数");
    expect(service.removeEntries).not.toHaveBeenCalled();
    expect(service.moveEntries).not.toHaveBeenCalled();
    expect(service.addTag).not.toHaveBeenCalled();
  });

  it("文件夹或标签编号不是字符串时抛出错误, 不调用服务", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.batchMoveEntries, ["a"], 7),
    ).toThrow("无效的批量参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.batchAddTag, ["a"], undefined),
    ).toThrow("无效的批量参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.batchRemoveTag, ["a"], {}),
    ).toThrow("无效的批量参数");
    expect(service.moveEntries).not.toHaveBeenCalled();
    expect(service.addTag).not.toHaveBeenCalled();
    expect(service.removeTag).not.toHaveBeenCalled();
  });
});
