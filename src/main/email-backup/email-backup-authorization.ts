import type { MasterPasswordVerifier } from "../vault/master-password-verifier";

/**
 * 邮箱备份的身份复核: 保险库设了主密码时, 保存设置与立即备份都要用户重新输入主密码.
 */
export interface EmailBackupAuthorization {
  /**
   * 判断保存设置与立即备份是否要重新输入主密码.
   * @returns 保险库设了主密码时为 true.
   */
  readonly requiresMasterPassword: () => Promise<boolean>;
  /**
   * 判断用户是否通过了复核: 没设主密码不需要, 设了就必须给出正确的主密码.
   * @param masterPassword 用户重新输入的主密码.
   * @returns 通过时为 true.
   */
  readonly isAuthorized: (
    masterPassword: string | undefined,
  ) => Promise<boolean>;
}

/**
 * 基于主密码校验器创建身份复核.
 * @param verifier 主密码校验器, 只校验, 不改动保险库状态.
 * @returns 身份复核.
 */
export function createEmailBackupAuthorization(
  verifier: MasterPasswordVerifier,
): EmailBackupAuthorization {
  return {
    requiresMasterPassword: () => verifier.hasMasterPassword(),
    isAuthorized: async (masterPassword) => {
      if (!(await verifier.hasMasterPassword())) {
        return true;
      }
      return (
        masterPassword !== undefined && (await verifier.verify(masterPassword))
      );
    },
  };
}
