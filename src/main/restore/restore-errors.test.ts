import { describe, expect, it } from "vitest";

import {
  BackupDamagedError,
  failureOfRestoreError,
  RestoreLimitExceededError,
  WrongPassphraseError,
} from "./restore-errors";

describe("恢复的错误与失败结果的对应", () => {
  it("错口令, 损坏与超限各对应一个失败原因", () => {
    expect(failureOfRestoreError(new WrongPassphraseError())).toEqual({
      ok: false,
      reason: "wrong-passphrase",
    });
    expect(
      failureOfRestoreError(new BackupDamagedError(new Error("x"))),
    ).toEqual({ ok: false, reason: "damaged-file" });
    expect(
      failureOfRestoreError(
        new RestoreLimitExceededError("archive", "too-large"),
      ),
    ).toEqual({
      ok: false,
      reason: "limit-exceeded",
      problem: { section: "archive", code: "too-large" },
    });
  });

  it("不认识的错误不转换, 交给调用方当意外失败", () => {
    expect(failureOfRestoreError(new Error("boom"))).toBeUndefined();
    expect(failureOfRestoreError("text")).toBeUndefined();
  });

  it("错误的名称可识别, 损坏错误的信息不含底层原因的内容, 原因另外保留", () => {
    const cause = new Error("path C:\\secret\\file.zip is bad");
    const damaged = new BackupDamagedError(cause);

    expect(damaged.name).toBe("BackupDamagedError");
    expect(damaged.message).not.toContain("secret");
    expect(damaged.cause).toBe(cause);
    expect(new WrongPassphraseError().name).toBe("WrongPassphraseError");
    expect(new RestoreLimitExceededError("archive", "too-large").name).toBe(
      "RestoreLimitExceededError",
    );
  });
});
