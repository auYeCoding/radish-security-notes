import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createFakeIpcMain } from "../testing/fake-ipc-main";
import type { VaultService } from "../vault/vault-service";
import { registerRecoveryKeyIpc } from "./recovery-key-ipc";

/**
 * 测试里查看恢复密钥成功时带回的词.
 */
const VIEWED_WORDS = ["abandon", "ability"];

/**
 * 创建带间谍方法的假保险库服务.
 * @returns 假服务.
 */
function createFakeService(): VaultService {
  return {
    viewRecoveryKey: vi.fn(() =>
      Promise.resolve({ ok: true, recoveryWords: VIEWED_WORDS }),
    ),
  } as unknown as VaultService;
}

describe("registerRecoveryKeyIpc 转交服务", () => {
  it("查看通道把主密码交给服务并返回带词的结果", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerRecoveryKeyIpc(ipcMain, service);

    const result = await ipcMain.invoke(
      IPC_CHANNELS.recoveryViewKey,
      "current password",
    );

    expect(service.viewRecoveryKey).toHaveBeenCalledWith("current password");
    expect(result).toEqual({ ok: true, recoveryWords: VIEWED_WORDS });
  });

  it("没有主密码时把 undefined 交给服务", async () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerRecoveryKeyIpc(ipcMain, service);

    await ipcMain.invoke(IPC_CHANNELS.recoveryViewKey, undefined);

    expect(service.viewRecoveryKey).toHaveBeenCalledWith(undefined);
  });
});

describe("registerRecoveryKeyIpc 参数校验", () => {
  it("主密码不是字符串也不是 undefined 时被拒绝且不触达服务", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerRecoveryKeyIpc(ipcMain, service);

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.recoveryViewKey, { password: "x" }),
    ).toThrow("无效的主密码");
    expect(() => ipcMain.invoke(IPC_CHANNELS.recoveryViewKey, null)).toThrow(
      "无效的主密码",
    );
    expect(service.viewRecoveryKey).not.toHaveBeenCalled();
  });
});
