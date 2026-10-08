import { describe, expect, it } from "vitest";

import { DatabaseKeyRejectedError } from "./database/open-encrypted-database";
import { VaultFailureRecorder } from "./vault-failure-recorder";

describe("VaultFailureRecorder", () => {
  it("没有记录时读到 undefined", () => {
    expect(new VaultFailureRecorder().get()).toBeUndefined();
  });

  it("记录文件不一致的原因时没有错误类名", () => {
    const recorder = new VaultFailureRecorder();

    recorder.recordCause("startup", "database-missing");

    expect(recorder.get()).toEqual({
      cause: "database-missing",
      stage: "startup",
      errorName: undefined,
    });
  });

  it("数据库拒绝数据密钥的错误归为 database-unreadable, 记下类名与阶段", () => {
    const recorder = new VaultFailureRecorder();

    recorder.recordError("unlock", new DatabaseKeyRejectedError("无法打开"));

    expect(recorder.get()).toEqual({
      cause: "database-unreadable",
      stage: "unlock",
      errorName: "DatabaseKeyRejectedError",
    });
  });

  it("其它错误归为 unexpected, 只记类名", () => {
    const recorder = new VaultFailureRecorder();

    recorder.recordError("startup", new TypeError("secret detail"));

    expect(recorder.get()).toEqual({
      cause: "unexpected",
      stage: "startup",
      errorName: "TypeError",
    });
  });
});

describe("VaultFailureRecorder 的边界", () => {
  it("记录里不含错误消息正文", () => {
    const recorder = new VaultFailureRecorder();

    recorder.recordError(
      "setup",
      new Error("C:\\Users\\someone\\vault-key.json"),
    );

    expect(JSON.stringify(recorder.get())).not.toContain("someone");
  });

  it("抛出的不是 Error 时类名为 UnknownError", () => {
    const recorder = new VaultFailureRecorder();

    recorder.recordError("restore", "plain string");

    expect(recorder.get()).toEqual({
      cause: "unexpected",
      stage: "restore",
      errorName: "UnknownError",
    });
  });

  it("后一次记录取代前一次, 清除后读到 undefined", () => {
    const recorder = new VaultFailureRecorder();
    recorder.recordCause("startup", "key-file-missing");

    recorder.recordError("unlock", new Error("boom"));
    expect(recorder.get()?.stage).toBe("unlock");

    recorder.clear();
    expect(recorder.get()).toBeUndefined();
  });
});
