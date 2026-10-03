import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { FolderService } from "../folders/folder-service";
import { createFakeIpcMain, type FakeIpcMain } from "../testing/fake-ipc-main";
import { registerFolderIpc } from "./folder-ipc";

/**
 * 创建带间谍方法的假文件夹服务.
 * @returns 假服务.
 */
function createFakeService(): FolderService {
  return {
    list: vi.fn(() => ({ ok: true, value: [] })),
    create: vi.fn(() => ({ ok: true, value: { id: "f-1", name: "n" } })),
    rename: vi.fn(() => ({ ok: true, value: { id: "f-1", name: "n" } })),
    remove: vi.fn(() => ({ ok: true, value: undefined })),
    assignEntry: vi.fn(() => ({ ok: true, value: undefined })),
  } as unknown as FolderService;
}

/**
 * 注册了文件夹 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假文件夹服务.
   */
  readonly service: FolderService;
}

/**
 * 注册文件夹 IPC 并返回假 IPC 与假服务.
 * @returns 假 IPC 与假服务.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = createFakeService();
  registerFolderIpc(ipcMain, service);
  return { ipcMain, service };
}

describe("registerFolderIpc 转发", () => {
  it("列表通道返回服务的结果", () => {
    const { ipcMain } = registerWithFakes();

    expect(ipcMain.invoke(IPC_CHANNELS.foldersList)).toEqual({
      ok: true,
      value: [],
    });
  });

  it("新建, 重命名与删除通道把参数交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.foldersCreate, "工作");
    ipcMain.invoke(IPC_CHANNELS.foldersRename, "f-1", "家庭");
    ipcMain.invoke(IPC_CHANNELS.foldersRemove, "f-1");

    expect(service.create).toHaveBeenCalledWith("工作");
    expect(service.rename).toHaveBeenCalledWith("f-1", "家庭");
    expect(service.remove).toHaveBeenCalledWith("f-1");
  });

  it("放入条目的通道把条目与文件夹编号交给服务, 文件夹编号可以省略", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.foldersAssignEntry, "e-1", "f-1");
    ipcMain.invoke(IPC_CHANNELS.foldersAssignEntry, "e-1", undefined);

    expect(service.assignEntry).toHaveBeenNthCalledWith(1, "e-1", "f-1");
    expect(service.assignEntry).toHaveBeenNthCalledWith(2, "e-1", undefined);
  });
});

describe("registerFolderIpc 参数校验", () => {
  it("参数不是字符串时抛出错误, 不调用服务", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() => ipcMain.invoke(IPC_CHANNELS.foldersCreate, 1)).toThrow(
      "无效的文件夹参数",
    );
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.foldersRename, "f-1", undefined),
    ).toThrow("无效的文件夹参数");
    expect(() => ipcMain.invoke(IPC_CHANNELS.foldersRemove, null)).toThrow(
      "无效的文件夹参数",
    );
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.foldersAssignEntry, "e-1", 7),
    ).toThrow("无效的文件夹参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.foldersAssignEntry, undefined, "f-1"),
    ).toThrow("无效的文件夹参数");
    expect(service.create).not.toHaveBeenCalled();
    expect(service.rename).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
    expect(service.assignEntry).not.toHaveBeenCalled();
  });
});
