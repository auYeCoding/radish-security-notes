import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createEmailBackupBridge } from "./create-email-backup-bridge";

/**
 * 一份合规的保存设置请求.
 */
const INPUT = {
  provider: "qq",
  host: "",
  port: 465,
  security: "ssl",
  senderAddress: "alice@qq.com",
  recipientAddress: "",
  sizeLimitMebibytes: 50,
  isEncrypted: true,
  hasAcknowledgedPlaintextRisk: false,
  authorizationCode: "code",
  passphrase: "a long enough passphrase",
} as const;

describe("createEmailBackupBridge: 通道与参数", () => {
  it("读取设置与保存设置调用对应通道, 保存带上请求", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: "x" }));
    const bridge = createEmailBackupBridge({ invoke });
    const settings = await bridge.getSettings();
    const saved = await bridge.saveSettings(INPUT);
    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.emailBackupGetSettings,
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.emailBackupSaveSettings,
      INPUT,
    );
    expect(settings).toEqual({ ok: true, value: "x" });
    expect(saved).toEqual({ ok: true, value: "x" });
  });

  it("发送测试, 立即备份与上次结果调用对应通道, 返回主进程的结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: "x" }));
    const bridge = createEmailBackupBridge({ invoke });
    const test = await bridge.sendTest();
    const run = await bridge.runBackup({ withoutAttachments: false });
    const last = await bridge.getLastResult();
    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.emailBackupSendTest);
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.emailBackupRunBackup,
      { withoutAttachments: false },
    );
    expect(invoke).toHaveBeenNthCalledWith(
      3,
      IPC_CHANNELS.emailBackupGetLastResult,
    );
    for (const result of [test, run, last]) {
      expect(result).toEqual({ ok: true, value: "x" });
    }
  });
});

describe("createEmailBackupBridge: 进度与接口形状", () => {
  it("getProgress 调用进度通道", async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({ stage: "sending", processed: 0, total: 0 }),
    );
    const progress = await createEmailBackupBridge({ invoke }).getProgress();
    expect(progress).toEqual({ stage: "sending", processed: 0, total: 0 });
    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.emailBackupProgress);
  });

  it("桥上只有八个方法, 没有任何返回授权码, 口令或文件路径的方法", () => {
    const bridge = createEmailBackupBridge({ invoke: vi.fn() });
    expect(Object.keys(bridge).sort()).toEqual([
      "getAutoBackup",
      "getLastResult",
      "getProgress",
      "getSettings",
      "runBackup",
      "saveAutoBackup",
      "saveSettings",
      "sendTest",
    ]);
  });
});

describe("createEmailBackupBridge: 自动备份", () => {
  it("读取与保存自动备份调用对应通道, 保存带上请求, 返回主进程的结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: "x" }));
    const bridge = createEmailBackupBridge({ invoke });
    const request = {
      isEnabled: true,
      interval: "weekly",
      masterPassword: "m",
    } as const;
    const status = await bridge.getAutoBackup();
    const saved = await bridge.saveAutoBackup(request);
    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.emailBackupGetAutoBackup,
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.emailBackupSaveAutoBackup,
      request,
    );
    expect(status).toEqual({ ok: true, value: "x" });
    expect(saved).toEqual({ ok: true, value: "x" });
  });
});
