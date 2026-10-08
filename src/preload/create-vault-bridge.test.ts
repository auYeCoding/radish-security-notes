import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createVaultBridge } from "./create-vault-bridge";

describe("createVaultBridge", () => {
  it("getStatus 调用读取状态通道并返回结果", async () => {
    const invoke = vi.fn(() => Promise.resolve("needs-setup"));

    const status = await createVaultBridge({ invoke }).getStatus();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.vaultGetStatus);
    expect(status).toBe("needs-setup");
  });

  it("setupWithMasterPassword 与 unlock 调用对应通道并带上主密码", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));
    const bridge = createVaultBridge({ invoke });

    await bridge.setupWithMasterPassword("first password");
    await bridge.unlock("second password");

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.vaultSetupWithMasterPassword,
      "first password",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.vaultUnlock,
      "second password",
    );
  });

  it("lock 调用锁定通道且不带参数并返回结果", async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({ ok: false, reason: "tasks-running" }),
    );

    const result = await createVaultBridge({ invoke }).lock();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.vaultLock);
    expect(result).toEqual({ ok: false, reason: "tasks-running" });
  });

  it("setupWithoutMasterPassword 调用跳过通道并返回结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));

    const result = await createVaultBridge({
      invoke,
    }).setupWithoutMasterPassword();

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.vaultSetupWithoutMasterPassword,
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("createVaultBridge 失败信息", () => {
  it("getFailure 调用读取失败信息通道且不带参数并返回结果", async () => {
    const failure = {
      cause: "key-file-missing",
      stage: "startup",
      errorName: undefined,
    };
    const invoke = vi.fn(() => Promise.resolve(failure));

    const result = await createVaultBridge({ invoke }).getFailure();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.vaultGetFailure);
    expect(result).toEqual(failure);
  });
});
