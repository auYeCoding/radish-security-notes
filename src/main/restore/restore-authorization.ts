import type { MasterPasswordVerifier } from "../vault/master-password-verifier";

/**
 * 判断用户是否通过了恢复前的主密码复核: 没设主密码不需要, 设了就必须给出正确的主密码. 只校验,
 * 不改动保险库状态.
 * @param verifier 主密码校验器.
 * @param masterPassword 用户重新输入的主密码.
 * @returns 通过时为 true.
 */
export async function isRestoreAuthorized(
  verifier: MasterPasswordVerifier,
  masterPassword: string | undefined,
): Promise<boolean> {
  if (!(await verifier.hasMasterPassword())) {
    return true;
  }
  return (
    masterPassword !== undefined && (await verifier.verify(masterPassword))
  );
}
