import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { EmailBackupService } from "../email-backup/email-backup-service";
import { createFakeIpcMain, type FakeIpcMain } from "../testing/fake-ipc-main";
import { registerEmailBackupIpc } from "./email-backup-ipc";

/**
 * 创建带间谍方法的假邮箱备份服务.
 * @returns 假服务.
 */
function createFakeService(): EmailBackupService {
  return {
    getSettings: vi.fn(async () => ({ ok: true, value: {} })),
    saveSettings: vi.fn(async () => ({ ok: true, value: {} })),
    sendTest: vi.fn(async () => ({ ok: true, value: undefined })),
    runBackup: vi.fn(async () => ({ ok: true, value: { status: "sent" } })),
    getProgress: vi.fn(() => ({ stage: "idle", processed: 0, total: 0 })),
    getLastResult: vi.fn(() => ({ ok: true, value: undefined })),
  } as unknown as EmailBackupService;
}

/**
 * 注册了邮箱备份 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假邮箱备份服务.
   */
  readonly service: EmailBackupService;
}

/**
 * 注册邮箱备份 IPC 并返回假 IPC 与假服务.
 * @returns 假 IPC 与假服务.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = createFakeService();
  registerEmailBackupIpc(ipcMain, service);
  return { ipcMain, service };
}

/**
 * 一份合规的保存设置请求, 带多余的键.
 */
const SETTINGS_REQUEST = {
  provider: "qq",
  host: "",
  port: 465,
  security: "ssl",
  senderAddress: "alice@qq.com",
  recipientAddress: "",
  sizeLimitMebibytes: 50,
  isEncrypted: false,
  hasAcknowledgedPlaintextRisk: true,
  authorizationCode: "code",
};

describe("registerEmailBackupIpc 转发", () => {
  it("保存设置与立即备份通道把校验过的参数交给服务", async () => {
    const { ipcMain, service } = registerWithFakes();
    await ipcMain.invoke(IPC_CHANNELS.emailBackupSaveSettings, {
      ...SETTINGS_REQUEST,
      extra: 1,
    });
    await ipcMain.invoke(IPC_CHANNELS.emailBackupRunBackup, {
      withoutAttachments: true,
      extra: 1,
    });
    expect(service.saveSettings).toHaveBeenCalledWith(SETTINGS_REQUEST);
    expect(service.runBackup).toHaveBeenCalledWith({
      withoutAttachments: true,
    });
  });

  it("读取设置, 发送测试, 进度与上次结果通道转发给服务", () => {
    const { ipcMain, service } = registerWithFakes();
    ipcMain.invoke(IPC_CHANNELS.emailBackupGetSettings);
    ipcMain.invoke(IPC_CHANNELS.emailBackupSendTest);
    const progress = ipcMain.invoke(IPC_CHANNELS.emailBackupProgress);
    ipcMain.invoke(IPC_CHANNELS.emailBackupGetLastResult);
    expect(progress).toEqual({ stage: "idle", processed: 0, total: 0 });
    expect(service.getSettings).toHaveBeenCalledTimes(1);
    expect(service.sendTest).toHaveBeenCalledTimes(1);
    expect(service.getLastResult).toHaveBeenCalledTimes(1);
  });
});

describe("registerEmailBackupIpc 进程边界校验", () => {
  it("保存设置请求不合规时抛错, 不交给服务", () => {
    const { ipcMain, service } = registerWithFakes();
    for (const bad of [undefined, {}, { provider: "qq" }, "qq"]) {
      expect(() =>
        ipcMain.invoke(IPC_CHANNELS.emailBackupSaveSettings, bad),
      ).toThrow("无效的邮箱备份参数");
    }
    expect(service.saveSettings).not.toHaveBeenCalled();
  });

  it("立即备份请求不合规时抛错, 不交给服务", () => {
    const { ipcMain, service } = registerWithFakes();
    for (const bad of [undefined, {}, { withoutAttachments: "yes" }]) {
      expect(() =>
        ipcMain.invoke(IPC_CHANNELS.emailBackupRunBackup, bad),
      ).toThrow("无效的邮箱备份参数");
    }
    expect(service.runBackup).not.toHaveBeenCalled();
  });
});
