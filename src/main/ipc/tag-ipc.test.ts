import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createFakeIpcMain, type FakeIpcMain } from "../testing/fake-ipc-main";
import type { TagService } from "../tags/tag-service";
import { registerTagIpc } from "./tag-ipc";

/**
 * 创建带间谍方法的假标签服务.
 * @returns 假服务.
 */
function createFakeService(): TagService {
  return {
    list: vi.fn(() => ({ ok: true, value: [] })),
    create: vi.fn(() => ({
      ok: true,
      value: { id: "t-1", name: "n", color: "red" },
    })),
    update: vi.fn(() => ({
      ok: true,
      value: { id: "t-1", name: "n", color: "red" },
    })),
    remove: vi.fn(() => ({ ok: true, value: undefined })),
  } as unknown as TagService;
}

/**
 * 注册了标签 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假标签服务.
   */
  readonly service: TagService;
}

/**
 * 注册标签 IPC 并返回假 IPC 与假服务.
 * @returns 假 IPC 与假服务.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = createFakeService();
  registerTagIpc(ipcMain, service);
  return { ipcMain, service };
}

describe("registerTagIpc 转发", () => {
  it("列表通道返回服务的结果", () => {
    const { ipcMain } = registerWithFakes();

    expect(ipcMain.invoke(IPC_CHANNELS.tagsList)).toEqual({
      ok: true,
      value: [],
    });
  });

  it("新建, 编辑与删除通道把参数交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.tagsCreate, "工作", "red");
    ipcMain.invoke(IPC_CHANNELS.tagsUpdate, "t-1", "家庭", "blue");
    ipcMain.invoke(IPC_CHANNELS.tagsRemove, "t-1");

    expect(service.create).toHaveBeenCalledWith("工作", "red");
    expect(service.update).toHaveBeenCalledWith("t-1", "家庭", "blue");
    expect(service.remove).toHaveBeenCalledWith("t-1");
  });
});

describe("registerTagIpc 参数校验", () => {
  it("参数不是字符串时抛出错误, 不调用服务", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() => ipcMain.invoke(IPC_CHANNELS.tagsCreate, 1, "red")).toThrow(
      "无效的标签参数",
    );
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.tagsCreate, "工作", undefined),
    ).toThrow("无效的标签参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.tagsUpdate, "t-1", undefined, "red"),
    ).toThrow("无效的标签参数");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.tagsUpdate, "t-1", "家庭", 7),
    ).toThrow("无效的标签参数");
    expect(() => ipcMain.invoke(IPC_CHANNELS.tagsRemove, null)).toThrow(
      "无效的标签参数",
    );
    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });
});
