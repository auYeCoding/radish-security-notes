import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { EntryService } from "../entries/entry-service";
import { registerEntryIpc } from "./entry-ipc";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 假的主进程 IPC, 记下注册的处理函数以便直接调用.
 */
interface FakeIpcMain extends IpcMainPort {
  /**
   * 调用某个通道上注册的处理函数.
   * @param channel 通道名.
   * @param args 传给处理函数的参数.
   * @returns 处理函数的返回值.
   */
  invoke: (channel: string, ...args: unknown[]) => unknown;
}

/**
 * 创建假的主进程 IPC.
 * @returns 假 IPC.
 */
function createFakeIpcMain(): FakeIpcMain {
  const handlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => unknown
  >();
  return {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
    invoke: (channel, ...args) => handlers.get(channel)?.({}, ...args),
  };
}

/**
 * 创建带间谍方法的假条目服务.
 * @returns 假服务.
 */
function createFakeService(): EntryService {
  return {
    list: vi.fn(() => ({ ok: true, value: [] })),
    get: vi.fn(() => ({ ok: false, reason: "not-found" })),
    create: vi.fn(() => ({ ok: true, value: { id: "id-1" } })),
    copyField: vi.fn(() => ({ ok: true, value: undefined })),
  } as unknown as EntryService;
}

/**
 * 注册了条目 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假条目服务.
   */
  readonly service: EntryService;
}

/**
 * 注册条目 IPC 并返回假 IPC 与假服务.
 * @returns 假 IPC 与假服务.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = createFakeService();
  registerEntryIpc(ipcMain, service);
  return { ipcMain, service };
}

describe("registerEntryIpc 转发", () => {
  it("列表通道返回服务的结果", () => {
    const { ipcMain } = registerWithFakes();

    expect(ipcMain.invoke(IPC_CHANNELS.entriesList)).toEqual({
      ok: true,
      value: [],
    });
  });

  it("详情通道把编号交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    const result = ipcMain.invoke(IPC_CHANNELS.entriesGet, "id-9");

    expect(service.get).toHaveBeenCalledWith("id-9");
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("新建通道把三个字符串字段交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.entriesCreate, {
      name: "n",
      account: "a",
      password: "p",
      extra: "ignored",
    });

    expect(service.create).toHaveBeenCalledWith({
      name: "n",
      account: "a",
      password: "p",
    });
  });

  it("复制通道把编号与字段名交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.entriesCopyField, "id-1", "password");

    expect(service.copyField).toHaveBeenCalledWith("id-1", "password");
  });
});

describe("registerEntryIpc 参数校验", () => {
  it("编号不是字符串时被拒绝且不触达服务", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() => ipcMain.invoke(IPC_CHANNELS.entriesGet, 1)).toThrow(
      "无效的条目编号",
    );
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.entriesCopyField, undefined, "account"),
    ).toThrow("无效的条目编号");
    expect(service.get).not.toHaveBeenCalled();
    expect(service.copyField).not.toHaveBeenCalled();
  });

  it("复制字段不是账号或密码时被拒绝", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.entriesCopyField, "id-1", "name"),
    ).toThrow("无效的复制字段");
    expect(service.copyField).not.toHaveBeenCalled();
  });

  it("新建内容不是三个字符串字段组成的对象时被拒绝", () => {
    const { ipcMain, service } = registerWithFakes();

    for (const input of [
      undefined,
      null,
      "text",
      { name: "n", account: "a" },
      { name: "n", account: 1, password: "p" },
    ]) {
      expect(() => ipcMain.invoke(IPC_CHANNELS.entriesCreate, input)).toThrow(
        "无效的条目内容",
      );
    }
    expect(service.create).not.toHaveBeenCalled();
  });
});
