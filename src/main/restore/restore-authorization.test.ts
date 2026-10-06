import { describe, expect, it, vi } from "vitest";

import type { MasterPasswordVerifier } from "../vault/master-password-verifier";
import { isRestoreAuthorized } from "./restore-authorization";

/**
 * 创建假的主密码校验器.
 * @param hasMasterPassword 保险库是否设了主密码.
 * @returns 校验器, 正确的主密码是 right.
 */
function createVerifier(hasMasterPassword: boolean): MasterPasswordVerifier {
  return {
    hasMasterPassword: () => Promise.resolve(hasMasterPassword),
    verify: vi.fn((password: string) => Promise.resolve(password === "right")),
  };
}

describe("恢复前的主密码复核", () => {
  it("没设主密码时不需要主密码, 也不校验", async () => {
    const verifier = createVerifier(false);

    expect(await isRestoreAuthorized(verifier, undefined)).toBe(true);
    expect(await isRestoreAuthorized(verifier, "anything")).toBe(true);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("设了主密码时必须给出正确的主密码", async () => {
    const verifier = createVerifier(true);

    expect(await isRestoreAuthorized(verifier, undefined)).toBe(false);
    expect(await isRestoreAuthorized(verifier, "wrong")).toBe(false);
    expect(await isRestoreAuthorized(verifier, "right")).toBe(true);
  });
});
