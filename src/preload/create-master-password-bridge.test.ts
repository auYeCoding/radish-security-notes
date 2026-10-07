import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createMasterPasswordBridge } from "./create-master-password-bridge";

describe("createMasterPasswordBridge", () => {
  it("hasMasterPassword 调用读取通道并返回布尔值", async () => {
    const invoke = vi.fn(() => Promise.resolve(true));

    const result = await createMasterPasswordBridge({
      invoke,
    }).hasMasterPassword();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.masterPasswordHas);
    expect(result).toBe(true);
  });

  it("enable 带上新主密码并原样返回结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));

    const result = await createMasterPasswordBridge({ invoke }).enable(
      "new password",
    );

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.masterPasswordEnable,
      "new password",
    );
    expect(result).toEqual({ ok: true });
  });

  it("disable 带上当前主密码并原样返回失败", async () => {
    const failure = { ok: false, reason: "system-protection-unavailable" };
    const invoke = vi.fn(() => Promise.resolve(failure));

    const result = await createMasterPasswordBridge({ invoke }).disable(
      "current password",
    );

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.masterPasswordDisable,
      "current password",
    );
    expect(result).toEqual(failure);
  });
});
