import { KeyUnwrapError } from "./aes-gcm-key-wrapper";
import { MASTER_PASSWORD_PROTECTION, type KeyRecord } from "./key-record";
import { unprotectWithMasterPassword } from "./master-password-key-protector";

/**
 * 校验主密码需要的密钥文件读取能力.
 */
export interface KeyRecordReader {
  /**
   * 读取密钥文件.
   * @returns 密钥文件内容, 文件不存在时为 undefined.
   */
  readonly read: () => Promise<KeyRecord | undefined>;
}

/**
 * 主密码校验器: 只校验, 不改动保险库状态与任何文件.
 */
export interface MasterPasswordVerifier {
  /**
   * 判断保险库是否设了主密码 (数据密钥由主密码保护), 跳过主密码的保险库没有.
   * @returns 设了主密码时为 true.
   */
  readonly hasMasterPassword: () => Promise<boolean>;
  /**
   * 校验用户输入的主密码: 用它尝试解开密钥文件里被保护的数据密钥, 解开后立即清零.
   * @param password 用户输入的主密码.
   * @returns 主密码正确时为 true; 没有设主密码或主密码不对时为 false.
   */
  readonly verify: (password: string) => Promise<boolean>;
}

/**
 * 创建主密码校验器. 校验用的是与解锁相同的 Argon2id 派生与 AES-256-GCM 解包, 所以主密码不对时
 * 一定被拒绝, 主密码对时数据密钥只在内存里短暂出现.
 * @param reader 密钥文件读取能力.
 * @returns 主密码校验器.
 */
export function createMasterPasswordVerifier(
  reader: KeyRecordReader,
): MasterPasswordVerifier {
  return {
    hasMasterPassword: async () =>
      (await reader.read())?.protection === MASTER_PASSWORD_PROTECTION,
    verify: async (password) => {
      const record = await reader.read();
      if (record?.protection !== MASTER_PASSWORD_PROTECTION) {
        return false;
      }
      try {
        const dataKey = await unprotectWithMasterPassword(record, password);
        dataKey.fill(0);
        return true;
      } catch (error) {
        if (error instanceof KeyUnwrapError) {
          return false;
        }
        throw error;
      }
    },
  };
}
