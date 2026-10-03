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
    update: vi.fn(() => ({ ok: true, value: { id: "id-1" } })),
    remove: vi.fn(() => ({ ok: true, value: undefined })),
    copyField: vi.fn(() => ({ ok: true, value: undefined })),
    copyCustomField: vi.fn(() => ({ ok: true, value: undefined })),
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

  it("新建通道把类型, 名称, 类型字段, 备注与自定义字段交给服务", () => {
    const { ipcMain, service } = registerWithFakes();
    const input = {
      type: "bankCard",
      name: "n",
      fields: { cardNumber: "6222", expiry: "12/30" },
      notes: "第一行\n第二行",
      customFields: [{ label: "助记词", value: "a b\nc", isHidden: true }],
      totp: "JBSWY3DPEHPK3PXP",
    };

    ipcMain.invoke(IPC_CHANNELS.entriesCreate, { ...input, extra: "ignored" });

    expect(service.create).toHaveBeenCalledWith(input);
  });

  it("复制通道把编号与字段名交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.entriesCopyField, "id-1", "password");
    ipcMain.invoke(IPC_CHANNELS.entriesCopyField, "id-1", "cardNumber");
    ipcMain.invoke(IPC_CHANNELS.entriesCopyField, "id-1", "notes");

    expect(service.copyField).toHaveBeenNthCalledWith(1, "id-1", "password");
    expect(service.copyField).toHaveBeenNthCalledWith(2, "id-1", "cardNumber");
    expect(service.copyField).toHaveBeenNthCalledWith(3, "id-1", "notes");
  });

  it("复制自定义字段通道把条目编号与字段编号交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    const result = ipcMain.invoke(
      IPC_CHANNELS.entriesCopyCustomField,
      "id-1",
      "id-2",
    );

    expect(service.copyCustomField).toHaveBeenCalledWith("id-1", "id-2");
    expect(result).toEqual({ ok: true, value: undefined });
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

  it("复制字段不是字符串时被拒绝", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.entriesCopyField, "id-1", undefined),
    ).toThrow("无效的复制字段");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.entriesCopyField, "id-1", { key: "account" }),
    ).toThrow("无效的复制字段");
    expect(service.copyField).not.toHaveBeenCalled();
  });

  it("复制自定义字段的条目编号或字段编号不是字符串时被拒绝", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.entriesCopyCustomField, 1, "id-2"),
    ).toThrow("无效的条目编号");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.entriesCopyCustomField, "id-1", undefined),
    ).toThrow("无效的字段编号");
    expect(service.copyCustomField).not.toHaveBeenCalled();
  });
});

/**
 * 内容类型都正确的更新输入.
 */
const validUpdate = {
  name: "n",
  fields: { account: "a", password: "p", url: "" },
  notes: "第一行\n第二行",
  customFields: [{ label: "助记词", value: "a b\nc", isHidden: true }],
  totp: "",
  removeTotp: true,
};

describe("registerEntryIpc 更新与删除", () => {
  it("更新通道把编号与更新内容交给服务, 多余的属性被丢弃", () => {
    const { ipcMain, service } = registerWithFakes();

    const result = ipcMain.invoke(IPC_CHANNELS.entriesUpdate, "id-1", {
      ...validUpdate,
      type: "bankCard",
      extra: "ignored",
    });

    expect(service.update).toHaveBeenCalledWith("id-1", validUpdate);
    expect(result).toEqual({ ok: true, value: { id: "id-1" } });
  });

  it("删除通道把编号交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    const result = ipcMain.invoke(IPC_CHANNELS.entriesRemove, "id-3");

    expect(service.remove).toHaveBeenCalledWith("id-3");
    expect(result).toEqual({ ok: true, value: undefined });
  });
});

describe("registerEntryIpc 更新与删除参数校验", () => {
  it("更新与删除的编号不是字符串时被拒绝且不触达服务", () => {
    const { ipcMain, service } = registerWithFakes();

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.entriesUpdate, 1, validUpdate),
    ).toThrow("无效的条目编号");
    expect(() => ipcMain.invoke(IPC_CHANNELS.entriesRemove, {})).toThrow(
      "无效的条目编号",
    );
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it("更新内容类型不对时被拒绝且不触达服务", () => {
    const { ipcMain, service } = registerWithFakes();

    for (const input of [
      undefined,
      null,
      "text",
      { name: "n" },
      { ...validUpdate, fields: { account: 1 } },
      { ...validUpdate, fields: undefined },
      { ...validUpdate, customFields: undefined },
      { ...validUpdate, totp: undefined },
      { ...validUpdate, removeTotp: "yes" },
      { ...validUpdate, removeTotp: undefined },
    ]) {
      expect(() =>
        ipcMain.invoke(IPC_CHANNELS.entriesUpdate, "id-1", input),
      ).toThrow("无效的条目内容");
    }
    expect(service.update).not.toHaveBeenCalled();
  });
});

describe("registerEntryIpc 新建参数校验", () => {
  it("新建内容类型不对时被拒绝", () => {
    const { ipcMain, service } = registerWithFakes();

    const valid = {
      type: "login",
      name: "n",
      fields: { account: "a" },
      notes: "",
      customFields: [],
      totp: "",
    };
    for (const input of [
      undefined,
      null,
      "text",
      { name: "n" },
      { ...valid, type: "custom" },
      { ...valid, fields: { account: 1 } },
      { ...valid, fields: undefined },
      { ...valid, customFields: undefined },
    ]) {
      expect(() => ipcMain.invoke(IPC_CHANNELS.entriesCreate, input)).toThrow(
        "无效的条目内容",
      );
    }
    expect(service.create).not.toHaveBeenCalled();
  });
});
