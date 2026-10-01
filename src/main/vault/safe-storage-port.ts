/**
 * safeStorage 异步解密的结果.
 */
export interface SafeStorageDecryptionResult {
  /**
   * 密文是否应当用新密钥重新加密.
   */
  readonly shouldReEncrypt: boolean;
  /**
   * 解密得到的明文.
   */
  readonly result: string;
}

/**
 * 系统保护依赖的 safeStorage 接口, Electron 的 `safeStorage` 满足它. 只含异步方法:
 * 同步方法在 Electron 45 弃用, 46 移除.
 */
export interface SafeStoragePort {
  /**
   * 判断异步加密是否可用.
   * @returns 可用时兑现为 true.
   */
  isAsyncEncryptionAvailable: () => Promise<boolean>;
  /**
   * 用系统凭据加密一段文本.
   * @param plainText 明文.
   * @returns 密文.
   */
  encryptStringAsync: (plainText: string) => Promise<Buffer>;
  /**
   * 用系统凭据解密密文.
   * @param encrypted 密文.
   * @returns 明文, 以及密文是否应当用新密钥重新加密.
   */
  decryptStringAsync: (
    encrypted: Buffer,
  ) => Promise<SafeStorageDecryptionResult>;
}
