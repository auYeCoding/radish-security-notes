import { createHash } from "node:crypto";

import type { SshPublicKey } from "./ssh-public-key-line";

/**
 * 指纹的哈希算法, Node 里的名称.
 */
const FINGERPRINT_HASH_ALGORITHM = "sha256";

/**
 * 指纹文本的前缀, OpenSSH 与 Bitwarden 都用哈希算法的大写名称加冒号.
 */
const FINGERPRINT_PREFIX = "SHA256:";

/**
 * base64 末尾的补位字符, 指纹里不写.
 */
const BASE64_PADDING = /=+$/;

/**
 * 算出公钥的 SHA256 指纹: `SHA256:` 加公钥数据块的 SHA-256 摘要的无补位 base64, 与 `ssh-keygen -l`
 * 的写法一致.
 * @param publicKey 解析好的公钥.
 * @returns 指纹文本.
 */
export function fingerprintOfSshPublicKey(publicKey: SshPublicKey): string {
  const digest = createHash(FINGERPRINT_HASH_ALGORITHM)
    .update(publicKey.blob)
    .digest("base64");
  return `${FINGERPRINT_PREFIX}${digest.replace(BASE64_PADDING, "")}`;
}
