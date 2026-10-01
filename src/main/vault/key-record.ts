import { z } from "zod";

/**
 * 密钥文件的格式版本.
 */
export const KEY_RECORD_VERSION = 1;

/**
 * 保护方式: 数据密钥由主密码派生的密钥包裹.
 */
export const MASTER_PASSWORD_PROTECTION = "master-password";

/**
 * 保护方式: 数据密钥由系统 (Electron safeStorage) 保护, 不需要输入主密码.
 */
export const SYSTEM_PROTECTION = "system-protected";

/**
 * 主密码派生所用算法的标识.
 */
export const KEY_DERIVATION_ALGORITHM = "argon2id";

/**
 * 包裹数据密钥时的关联数据, 把密文绑定到本应用的数据密钥用途与格式版本.
 */
export const KEY_WRAP_ASSOCIATED_DATA = Buffer.from(
  `radish-security-notes/vault-data-key/v${KEY_RECORD_VERSION}`,
  "utf8",
);

/**
 * 以 base64 文本保存的二进制数据.
 */
const base64Text = z.base64();

/**
 * 正整数, 用于成本参数.
 */
const positiveInteger = z.number().int().positive();

/**
 * 主密码保护方式的密钥文件结构.
 */
const masterPasswordKeyRecordSchema = z.object({
  version: z.literal(KEY_RECORD_VERSION),
  protection: z.literal(MASTER_PASSWORD_PROTECTION),
  keyDerivation: z.object({
    algorithm: z.literal(KEY_DERIVATION_ALGORITHM),
    memoryCostKibibytes: positiveInteger,
    timeCost: positiveInteger,
    parallelism: positiveInteger,
    salt: base64Text,
  }),
  wrappedDataKey: z.object({
    nonce: base64Text,
    ciphertext: base64Text,
    tag: base64Text,
  }),
});

/**
 * 系统保护方式的密钥文件结构.
 */
const systemKeyRecordSchema = z.object({
  version: z.literal(KEY_RECORD_VERSION),
  protection: z.literal(SYSTEM_PROTECTION),
  wrappedDataKey: base64Text,
});

/**
 * 密钥文件的结构, 按保护方式区分.
 */
const keyRecordSchema = z.discriminatedUnion("protection", [
  masterPasswordKeyRecordSchema,
  systemKeyRecordSchema,
]);

/**
 * 主密码保护方式的密钥文件内容.
 */
export type MasterPasswordKeyRecord = z.infer<
  typeof masterPasswordKeyRecordSchema
>;

/**
 * 系统保护方式的密钥文件内容.
 */
export type SystemKeyRecord = z.infer<typeof systemKeyRecordSchema>;

/**
 * 密钥文件的内容: 主密码保护或系统保护.
 */
export type KeyRecord = MasterPasswordKeyRecord | SystemKeyRecord;

/**
 * 密钥文件内容不合法时抛出的错误.
 */
export class InvalidKeyRecordError extends Error {
  /**
   * 创建密钥文件不合法的错误.
   * @param message 错误信息.
   * @param options 错误选项, 用于保留底层原因.
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidKeyRecordError";
  }
}

/**
 * 校验并解析密钥文件的内容.
 * @param value 从密钥文件读出的 JSON 值.
 * @returns 合法的密钥文件内容.
 * @throws InvalidKeyRecordError 当结构不合法时.
 */
export function parseKeyRecord(value: unknown): KeyRecord {
  const result = keyRecordSchema.safeParse(value);
  if (!result.success) {
    throw new InvalidKeyRecordError("密钥文件的结构不合法", {
      cause: result.error,
    });
  }
  return result.data;
}
