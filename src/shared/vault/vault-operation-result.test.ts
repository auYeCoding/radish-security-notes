import { describe, expect, it } from "vitest";

import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
} from "./vault-operation-result";

describe("vaultOperationFailed", () => {
  it("只给原因时不带词位置", () => {
    expect(vaultOperationFailed("wrong-password")).toEqual({
      ok: false,
      reason: "wrong-password",
    });
  });

  it("词不在词表时带上词位置", () => {
    expect(vaultOperationFailed("recovery-unknown-word", 7)).toEqual({
      ok: false,
      reason: "recovery-unknown-word",
      wordPosition: 7,
    });
  });
});

describe("VAULT_OPERATION_SUCCEEDED", () => {
  it("表示成功", () => {
    expect(VAULT_OPERATION_SUCCEEDED).toEqual({ ok: true });
  });
});
