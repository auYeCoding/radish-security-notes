import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { RecoveryTextFileSaver } from "../recovery/recovery-text-file-saver";
import { createFakeIpcMain } from "../testing/fake-ipc-main";
import type { VaultService } from "../vault/vault-service";
import { registerRecoveryIpc } from "./recovery-ipc";

/**
 * 测试用的恢复词.
 */
const WORDS = ["abandon", "ability", "able"];

/**
 * 创建带间谍方法的假保险库服务.
 * @returns 假服务.
 */
function createFakeService(): VaultService {
  return {
    verifyRecoveryWords: vi.fn(() => Promise.resolve({ ok: true })),
    restoreWithMasterPassword: vi.fn(() => Promise.resolve({ ok: true })),
    restoreWithoutMasterPassword: vi.fn(() =>
      Promise.resolve({
        ok: false,
        reason: "recovery-unknown-word",
        wordPosition: 2,
      }),
    ),
  } as unknown as VaultService;
}

/**
 * 创建带间谍方法的假文本文件保存器.
 * @returns 假保存器.
 */
function createFakeSaver(): RecoveryTextFileSaver {
  return {
    save: vi.fn(() => Promise.resolve("saved")),
  } as unknown as RecoveryTextFileSaver;
}

describe("registerRecoveryIpc 转交服务", () => {
  it("校验通道把词交给服务并返回结果", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerRecoveryIpc(ipcMain, service, createFakeSaver());

    const result = await ipcMain.invoke(
      IPC_CHANNELS.recoveryVerifyWords,
      WORDS,
    );

    expect(service.verifyRecoveryWords).toHaveBeenCalledWith(WORDS);
    expect(result).toEqual({ ok: true });
  });

  it("带新主密码恢复的通道把词与主密码交给服务", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerRecoveryIpc(ipcMain, service, createFakeSaver());

    await ipcMain.invoke(
      IPC_CHANNELS.recoveryRestoreWithMasterPassword,
      WORDS,
      "a long enough password",
    );

    expect(service.restoreWithMasterPassword).toHaveBeenCalledWith(
      WORDS,
      "a long enough password",
    );
  });
});

describe("registerRecoveryIpc 恢复与保存", () => {
  it("跳过恢复的通道把词交给服务并返回带位置的失败", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerRecoveryIpc(ipcMain, service, createFakeSaver());

    const result = await ipcMain.invoke(
      IPC_CHANNELS.recoveryRestoreWithoutMasterPassword,
      WORDS,
    );

    expect(service.restoreWithoutMasterPassword).toHaveBeenCalledWith(WORDS);
    expect(result).toEqual({
      ok: false,
      reason: "recovery-unknown-word",
      wordPosition: 2,
    });
  });

  it("保存文本文件通道把词交给保存器并返回结果", async () => {
    const ipcMain = createFakeIpcMain();
    const saver = createFakeSaver();
    registerRecoveryIpc(ipcMain, createFakeService(), saver);

    const result = await ipcMain.invoke(
      IPC_CHANNELS.recoverySaveTextFile,
      WORDS,
    );

    expect(saver.save).toHaveBeenCalledWith(WORDS);
    expect(result).toBe("saved");
  });
});

describe("registerRecoveryIpc 参数校验", () => {
  it("词不是字符串数组时被拒绝且不触达服务与保存器", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    const saver = createFakeSaver();
    registerRecoveryIpc(ipcMain, service, saver);

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.recoveryVerifyWords, "abandon ability"),
    ).toThrow("无效的恢复词");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.recoverySaveTextFile, [1, 2]),
    ).toThrow("无效的恢复词");
    expect(service.verifyRecoveryWords).not.toHaveBeenCalled();
    expect(saver.save).not.toHaveBeenCalled();
  });

  it("新主密码不是字符串时被拒绝", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerRecoveryIpc(ipcMain, service, createFakeSaver());

    expect(() =>
      ipcMain.invoke(
        IPC_CHANNELS.recoveryRestoreWithMasterPassword,
        WORDS,
        undefined,
      ),
    ).toThrow("无效的主密码");
    expect(service.restoreWithMasterPassword).not.toHaveBeenCalled();
  });
});
