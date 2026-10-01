import { unwrapKey, wrapKey } from "./aes-gcm-key-wrapper";
import {
  DEFAULT_ARGON2_PARAMETERS,
  type Argon2Parameters,
} from "./argon2-parameters";
import {
  deriveKeyFromPassword,
  generateArgon2Salt,
} from "./argon2-key-derivation";
import {
  KEY_DERIVATION_ALGORITHM,
  KEY_RECORD_VERSION,
  KEY_WRAP_ASSOCIATED_DATA,
  MASTER_PASSWORD_PROTECTION,
  type MasterPasswordKeyRecord,
} from "./key-record";

/**
 * 用主密码保护数据密钥: 先用 Argon2id 从主密码派生包裹密钥, 再用 AES-256-GCM
 * 包裹数据密钥.
 * @param dataKey 被保护的数据密钥.
 * @param password 用户设置的主密码.
 * @param parameters Argon2id 成本参数, 默认取新建保险库的取值.
 * @returns 可写入密钥文件的记录, 不含主密码与明文数据密钥.
 */
export async function protectWithMasterPassword(
  dataKey: Buffer,
  password: string,
  parameters: Argon2Parameters = DEFAULT_ARGON2_PARAMETERS,
): Promise<MasterPasswordKeyRecord> {
  const salt = generateArgon2Salt();
  const wrappingKey = await deriveKeyFromPassword({
    password,
    salt,
    parameters,
  });
  try {
    const wrapped = wrapKey(dataKey, wrappingKey, KEY_WRAP_ASSOCIATED_DATA);
    return {
      version: KEY_RECORD_VERSION,
      protection: MASTER_PASSWORD_PROTECTION,
      keyDerivation: {
        algorithm: KEY_DERIVATION_ALGORITHM,
        ...parameters,
        salt: salt.toString("base64"),
      },
      wrappedDataKey: {
        nonce: wrapped.nonce.toString("base64"),
        ciphertext: wrapped.ciphertext.toString("base64"),
        tag: wrapped.tag.toString("base64"),
      },
    };
  } finally {
    wrappingKey.fill(0);
  }
}

/**
 * 用主密码解开被保护的数据密钥.
 * @param record 密钥文件中的主密码保护记录.
 * @param password 用户输入的主密码.
 * @returns 数据密钥.
 * @throws KeyUnwrapError 当主密码不对或记录被篡改时.
 */
export async function unprotectWithMasterPassword(
  record: MasterPasswordKeyRecord,
  password: string,
): Promise<Buffer> {
  const { keyDerivation, wrappedDataKey } = record;
  const wrappingKey = await deriveKeyFromPassword({
    password,
    salt: Buffer.from(keyDerivation.salt, "base64"),
    parameters: keyDerivation,
  });
  try {
    return unwrapKey(
      {
        nonce: Buffer.from(wrappedDataKey.nonce, "base64"),
        ciphertext: Buffer.from(wrappedDataKey.ciphertext, "base64"),
        tag: Buffer.from(wrappedDataKey.tag, "base64"),
      },
      wrappingKey,
      KEY_WRAP_ASSOCIATED_DATA,
    );
  } finally {
    wrappingKey.fill(0);
  }
}
