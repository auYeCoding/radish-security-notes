import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createRecoveryBridge } from "./create-recovery-bridge";

/**
 * 测试用的恢复词.
 */
const WORDS = ["abandon", "ability"];

describe("createRecoveryBridge", () => {
  it("verifyWords 调用校验通道并返回结果", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));

    const result = await createRecoveryBridge({ invoke }).verifyWords(WORDS);

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.recoveryVerifyWords,
      WORDS,
    );
    expect(result).toEqual({ ok: true });
  });

  it("restoreWithMasterPassword 带上词与新主密码", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));

    await createRecoveryBridge({ invoke }).restoreWithMasterPassword(
      WORDS,
      "new password",
    );

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.recoveryRestoreWithMasterPassword,
      WORDS,
      "new password",
    );
  });

  it("restoreWithoutMasterPassword 只带词, 并原样返回带位置的失败", async () => {
    const failure = {
      ok: false,
      reason: "recovery-unknown-word",
      wordPosition: 3,
    };
    const invoke = vi.fn(() => Promise.resolve(failure));

    const result = await createRecoveryBridge({
      invoke,
    }).restoreWithoutMasterPassword(WORDS);

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.recoveryRestoreWithoutMasterPassword,
      WORDS,
    );
    expect(result).toEqual(failure);
  });

  it("saveTextFile 调用保存通道并返回状态", async () => {
    const invoke = vi.fn(() => Promise.resolve("cancelled"));

    const status = await createRecoveryBridge({ invoke }).saveTextFile(WORDS);

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.recoverySaveTextFile,
      WORDS,
    );
    expect(status).toBe("cancelled");
  });
});
