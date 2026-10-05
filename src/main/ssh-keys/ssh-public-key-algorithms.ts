/**
 * 一种能写成 OpenSSH 公钥一行的公钥类型.
 */
export interface SshPublicKeyAlgorithm {
  /**
   * 公钥一行的第一段, 也是数据块里的第一个字段.
   */
  readonly name: string;
  /**
   * 数据块里算法名之后的字段个数.
   */
  readonly fieldCount: number;
}

/**
 * 认得的公钥类型, 取自 OpenSSH 源码里非证书的公钥类型: `ssh-ed25519.c`, `ssh-ed25519-sk.c`,
 * `ssh-ecdsa.c`, `ssh-ecdsa-sk.c`, `ssh-rsa.c`. 字段个数: ed25519 一个公钥; sk-ed25519 多一个应用
 * 标识; ecdsa 是曲线名与曲线点; sk-ecdsa 再多一个应用标识; rsa 是指数与模数.
 */
export const SSH_PUBLIC_KEY_ALGORITHMS: readonly SshPublicKeyAlgorithm[] = [
  { name: "ssh-ed25519", fieldCount: 1 },
  { name: "sk-ssh-ed25519@openssh.com", fieldCount: 2 },
  { name: "ecdsa-sha2-nistp256", fieldCount: 2 },
  { name: "ecdsa-sha2-nistp384", fieldCount: 2 },
  { name: "ecdsa-sha2-nistp521", fieldCount: 2 },
  { name: "sk-ecdsa-sha2-nistp256@openssh.com", fieldCount: 3 },
  { name: "ssh-rsa", fieldCount: 2 },
];

/**
 * 按算法名查公钥类型.
 * @param name 公钥一行的第一段.
 * @returns 公钥类型, 算法名不在认得的范围内时为 undefined.
 */
export function findSshPublicKeyAlgorithm(
  name: string,
): SshPublicKeyAlgorithm | undefined {
  return SSH_PUBLIC_KEY_ALGORITHMS.find((algorithm) => algorithm.name === name);
}
