import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createFakeIpcMain } from "../testing/fake-ipc-main";
import type { MasterPasswordVerifier } from "../vault/master-password-verifier";
import type { VaultService } from "../vault/vault-service";
import { registerMasterPasswordIpc } from "./master-password-ipc";

/**
 * 创建带间谍方法的假保险库服务.
 * @returns 假服务.
 */
function createFakeService(): VaultService {
  return {
    enableMasterPassword: vi.fn(() => Promise.resolve({ ok: true })),
    disableMasterPassword: vi.fn(() =>
      Promise.resolve({ ok: false, reason: "wrong-password" }),
    ),
  } as unknown as VaultService;
}

/**
 * 创建带间谍方法的假主密码校验器.
 * @param hasMasterPassword 校验器回答的当前是否设了主密码.
 * @returns 假校验器.
 */
function createFakeVerifier(
  hasMasterPassword: boolean,
): MasterPasswordVerifier {
  return {
    hasMasterPassword: vi.fn(() => Promise.resolve(hasMasterPassword)),
    verify: vi.fn(() => Promise.resolve(false)),
  };
}

describe("registerMasterPasswordIpc 转交服务", () => {
  it("读取通道返回校验器对当前是否设了主密码的回答", async () => {
    const ipcMain = createFakeIpcMain();
    const verifier = createFakeVerifier(true);
    registerMasterPasswordIpc(ipcMain, createFakeService(), verifier);

    const result = await ipcMain.invoke(IPC_CHANNELS.masterPasswordHas);

    expect(verifier.hasMasterPassword).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it("开启通道把新主密码交给服务并返回结果", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerMasterPasswordIpc(ipcMain, service, createFakeVerifier(false));

    const result = await ipcMain.invoke(
      IPC_CHANNELS.masterPasswordEnable,
      "a long enough password",
    );

    expect(service.enableMasterPassword).toHaveBeenCalledWith(
      "a long enough password",
    );
    expect(result).toEqual({ ok: true });
  });

  it("关闭通道把当前主密码交给服务并返回失败结果", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerMasterPasswordIpc(ipcMain, service, createFakeVerifier(true));

    const result = await ipcMain.invoke(
      IPC_CHANNELS.masterPasswordDisable,
      "current password",
    );

    expect(service.disableMasterPassword).toHaveBeenCalledWith(
      "current password",
    );
    expect(result).toEqual({ ok: false, reason: "wrong-password" });
  });
});

describe("registerMasterPasswordIpc 参数校验", () => {
  it("开启时主密码不是字符串被拒绝且不触达服务", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerMasterPasswordIpc(ipcMain, service, createFakeVerifier(false));

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.masterPasswordEnable, { password: "x" }),
    ).toThrow("无效的主密码");
    expect(service.enableMasterPassword).not.toHaveBeenCalled();
  });

  it("关闭时主密码不是字符串被拒绝且不触达服务", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerMasterPasswordIpc(ipcMain, service, createFakeVerifier(true));

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.masterPasswordDisable, undefined),
    ).toThrow("无效的主密码");
    expect(service.disableMasterPassword).not.toHaveBeenCalled();
  });
});
