import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * 包裹密钥用的算法.
 */
const AES_GCM_ALGORITHM = "aes-256-gcm";

/**
 * AES-GCM 随机数的字节数.
 */
const AES_GCM_NONCE_BYTES = 12;

/**
 * AES-GCM 认证标签的字节数.
 */
const AES_GCM_TAG_BYTES = 16;

/**
 * 被 AES-256-GCM 包裹的密钥.
 */
export interface WrappedKey {
  /**
   * 每次包裹随机生成的随机数.
   */
  readonly nonce: Buffer;
  /**
   * 密钥的密文.
   */
  readonly ciphertext: Buffer;
  /**
   * 认证标签, 密文, 随机数或关联数据被改动时校验失败.
   */
  readonly tag: Buffer;
}

/**
 * 解包失败时抛出的错误: 包裹用的密钥不对, 或被包裹的数据被篡改.
 */
export class KeyUnwrapError extends Error {
  /**
   * 创建解包失败的错误.
   * @param message 错误信息.
   * @param options 错误选项, 用于保留底层原因.
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "KeyUnwrapError";
  }
}

/**
 * 用 AES-256-GCM 包裹一个密钥.
 * @param plainKey 被包裹的密钥.
 * @param wrappingKey 32 字节的包裹密钥.
 * @param associatedData 参与认证但不加密的关联数据.
 * @returns 包裹结果.
 */
export function wrapKey(
  plainKey: Buffer,
  wrappingKey: Buffer,
  associatedData: Buffer,
): WrappedKey {
  const nonce = randomBytes(AES_GCM_NONCE_BYTES);
  const cipher = createCipheriv(AES_GCM_ALGORITHM, wrappingKey, nonce, {
    authTagLength: AES_GCM_TAG_BYTES,
  });
  cipher.setAAD(associatedData);
  const ciphertext = Buffer.concat([cipher.update(plainKey), cipher.final()]);
  return { nonce, ciphertext, tag: cipher.getAuthTag() };
}

/**
 * 解开被 AES-256-GCM 包裹的密钥.
 * @param wrapped 包裹结果.
 * @param wrappingKey 32 字节的包裹密钥.
 * @param associatedData 包裹时使用的关联数据.
 * @returns 被包裹的密钥.
 * @throws KeyUnwrapError 当包裹密钥不对或数据被篡改时.
 */
export function unwrapKey(
  wrapped: WrappedKey,
  wrappingKey: Buffer,
  associatedData: Buffer,
): Buffer {
  try {
    const decipher = createDecipheriv(
      AES_GCM_ALGORITHM,
      wrappingKey,
      wrapped.nonce,
      { authTagLength: AES_GCM_TAG_BYTES },
    );
    decipher.setAAD(associatedData);
    decipher.setAuthTag(wrapped.tag);
    return Buffer.concat([
      decipher.update(wrapped.ciphertext),
      decipher.final(),
    ]);
  } catch (error) {
    throw new KeyUnwrapError("数据密钥解包失败", { cause: error });
  }
}
