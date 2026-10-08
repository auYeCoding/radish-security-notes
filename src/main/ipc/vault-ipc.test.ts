import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { VaultService } from "../vault/vault-service";
import type { IpcMainPort } from "./preferences-ipc";
import { registerVaultIpc } from "./vault-ipc";

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
 * 创建带间谍方法的假保险库服务.
 * @returns 假服务.
 */
function createFakeService(): VaultService {
  return {
    getStatus: vi.fn(() => "locked"),
    getFailure: vi.fn(() => ({
      cause: "database-missing",
      stage: "startup",
      errorName: undefined,
    })),
    setupWithMasterPassword: vi.fn(() => Promise.resolve({ ok: true })),
    setupWithoutMasterPassword: vi.fn(() => Promise.resolve({ ok: true })),
    unlock: vi.fn(() =>
      Promise.resolve({ ok: false, reason: "wrong-password" }),
    ),
    lock: vi.fn(() => Promise.resolve({ ok: false, reason: "tasks-running" })),
  } as unknown as VaultService;
}

describe("registerVaultIpc", () => {
  it("读取状态通道返回服务的当前状态", () => {
    const ipcMain = createFakeIpcMain();
    registerVaultIpc(ipcMain, createFakeService());

    expect(ipcMain.invoke(IPC_CHANNELS.vaultGetStatus)).toBe("locked");
  });

  it("设置主密码通道把字符串交给服务并返回结果", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerVaultIpc(ipcMain, service);

    const result = await ipcMain.invoke(
      IPC_CHANNELS.vaultSetupWithMasterPassword,
      "a long enough password",
    );

    expect(service.setupWithMasterPassword).toHaveBeenCalledWith(
      "a long enough password",
    );
    expect(result).toEqual({ ok: true });
  });

  it("跳过通道调用服务的跳过方法", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerVaultIpc(ipcMain, service);

    await ipcMain.invoke(IPC_CHANNELS.vaultSetupWithoutMasterPassword);

    expect(service.setupWithoutMasterPassword).toHaveBeenCalledTimes(1);
  });

  it("解锁通道把字符串交给服务并返回结果", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerVaultIpc(ipcMain, service);

    const result = await ipcMain.invoke(IPC_CHANNELS.vaultUnlock, "wrong");

    expect(service.unlock).toHaveBeenCalledWith("wrong");
    expect(result).toEqual({ ok: false, reason: "wrong-password" });
  });

  it("主密码不是字符串时被拒绝且不触达服务", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerVaultIpc(ipcMain, service);

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.vaultSetupWithMasterPassword, 12345678),
    ).toThrow("无效的主密码");
    expect(() => ipcMain.invoke(IPC_CHANNELS.vaultUnlock, undefined)).toThrow(
      "无效的主密码",
    );
    expect(service.setupWithMasterPassword).not.toHaveBeenCalled();
    expect(service.unlock).not.toHaveBeenCalled();
  });
});

describe("registerVaultIpc 失败信息", () => {
  it("读取失败信息通道返回服务的失败信息", () => {
    const ipcMain = createFakeIpcMain();
    registerVaultIpc(ipcMain, createFakeService());

    expect(ipcMain.invoke(IPC_CHANNELS.vaultGetFailure)).toEqual({
      cause: "database-missing",
      stage: "startup",
      errorName: undefined,
    });
  });
});

describe("registerVaultIpc 锁定", () => {
  it("锁定通道不带参数调用服务的锁定方法并返回结果", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerVaultIpc(ipcMain, service);

    const result = await ipcMain.invoke(IPC_CHANNELS.vaultLock);

    expect(service.lock).toHaveBeenCalledWith();
    expect(result).toEqual({ ok: false, reason: "tasks-running" });
  });
});
