import { createHash } from "node:crypto";

/**
 * 一个来源可查的公钥样例.
 */
export interface SshPublicKeySample {
  /**
   * 样例的名称, 测试描述里用.
   */
  readonly label: string;
  /**
   * 公钥一行的算法名.
   */
  readonly algorithm: string;
  /**
   * 带注释的公钥一行, 原文取自来源.
   */
  readonly line: string;
  /**
   * 来源给出的 SHA256 指纹.
   */
  readonly fingerprint: string;
}

/**
 * 指纹末尾的补位字符, 指纹里不写.
 */
const BASE64_PADDING = /=+$/;

/**
 * 不经过实现, 直接用 `node:crypto` 对公钥行里的 base64 数据块算 SHA256 指纹, 让测试对实现做独立
 * 计算.
 * @param publicKeyLine 公钥一行, 第二段是 base64 数据块.
 * @returns 独立算出的指纹.
 */
export function independentFingerprintOf(publicKeyLine: string): string {
  const blobText = publicKeyLine.trim().split(/\s+/)[1] ?? "";
  const digest = createHash("sha256")
    .update(Buffer.from(blobText, "base64"))
    .digest("base64");
  return `SHA256:${digest.replace(BASE64_PADDING, "")}`;
}

/**
 * ed25519 公钥样例, 导出测试的共享样例条目用它. 来源见 `SSH_PUBLIC_KEY_SAMPLES`.
 */
export const ED25519_PUBLIC_KEY_SAMPLE: SshPublicKeySample = {
  label: "ed25519",
  algorithm: "ssh-ed25519",
  line: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILM+rvN+ot98qgEN796jTiQfZfG1KaT0PtFDJ/XFSqti user@example.com",
  fingerprint: "SHA256:UCUiLr7Pjs9wFFJMDByLgc3NrtdU344OgUM45wZPcIQ",
};

/**
 * 公钥样例的来源: `RustCrypto/SSH` 仓库提交 `9510a65ac02e390998181a61788ec05206e50dbe`, 公钥行取自
 * `ssh-key/tests/examples/` 下的 `*.pub` 文件 (示例密钥, 注释是 `user@example.com`), 指纹取自
 * `ssh-key/tests/public_key.rs` 里对应解码测试的期望值: ecdsa p256 第 130 行, p384 第 161 行, p521
 * 第 193 行, ed25519 第 212 行, rsa 3072 第 242 行, sk-ecdsa 第 301 行, sk-ed25519 第 342 行.
 * 这些是公开的示例公钥, 没有对应的私钥.
 */
export const SSH_PUBLIC_KEY_SAMPLES: readonly SshPublicKeySample[] = [
  ED25519_PUBLIC_KEY_SAMPLE,
  {
    label: "rsa 3072",
    algorithm: "ssh-rsa",
    line: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCmjkeMm8k3JkNrf16eb5pG4bc77B6Mt3VN4saltsRV8vASpyWa/PlBgdaeldOaNJ5NK0gqU3KyiUNzHbdcc8572e7IUBDJS/rlaWARiSL4aos2VbNX0k56Z5zYp9m/bq5m9/mlb+PQkNBjIhimgpYNiq2TwBiYeA6tLb79cPtHA0cX5BLk/a5oUpLsiR4kI/f+Q98vVDKasKXXVh5YLkLobrruDB6er2A9fOcIUF0O4JCRLh/Dc161gE3fQrYTMQenbppZzfxrZfQ8YwLPvKjnqm+XRX+pbTtaJuj0EgTSzUK+EZxoSw8CNwiZpxrjwecTMVQ8w/srQmh4ABGuTqk0wP8HcI7hg+fpBv7kiejh5X/Oehxt+Puu85u9GVXb1a0av/vhJvUCBcuISvCA/z1wVJ0xdLhb1/ZiTDdTzyNbZQ0OQijzK+e1SlkNhp+3eGVZu3pNZvnTppwIXv3wg6kV1HodkWGgh1ayY7Buc52Z8okDYqvJat5CzOj5OaQNr/k= user@example.com",
    fingerprint: "SHA256:Fmxts/GcV77PakFnf1Ueki5mpU4ZjUQWGRjZGAo3n/I",
  },
  {
    label: "ecdsa p256",
    algorithm: "ecdsa-sha2-nistp256",
    line: "ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBHwf2HMM5TRXvo2SQJjsNkiDD5KqiiNjrGVv3UUh+mMT5RHxiRtOnlqvjhQtBq0VpmpCV/PwUdhOig4vkbqAcEc= user@example.com",
    fingerprint: "SHA256:JQ6FV0rf7qqJHZqIj4zNH8eV0oB8KLKh9Pph3FTD98g",
  },
  {
    label: "ecdsa p384",
    algorithm: "ecdsa-sha2-nistp384",
    line: "ecdsa-sha2-nistp384 AAAAE2VjZHNhLXNoYTItbmlzdHAzODQAAAAIbmlzdHAzODQAAABhBC5ugtxUB/EEoREXx8BbGZPDzrPbJfrmi6FpUCpP+TldmtNrVD6AFP8V1wjiHwn1hapt+tV1t5uUNBi4YZjZvNmwf/+TmbFdQ9NO+usuVrezPP+ICyQrPgtYr5bHWEHsQQ== user@example.com",
    fingerprint: "SHA256:nkGE8oV7pHvOiPKHtQRs67WUPiVLRxbNu//gV/k4Vjw",
  },
  {
    label: "ecdsa p521",
    algorithm: "ecdsa-sha2-nistp521",
    line: "ecdsa-sha2-nistp521 AAAAE2VjZHNhLXNoYTItbmlzdHA1MjEAAAAIbmlzdHA1MjEAAACFBAFhNpNPGSsj2WH79EyBhBZgAs6ix9GLIK0BjQRu8GjT6CUP1OnxfKZpOoVUwyaabZ9XYqL5osuHl9SyAd5CHT3MWAEDy5R6hYu3eD34Y/gpUdlvkaeSXX4rqtJuR+Py+lsHyCcoSKRCO3UNetK4tpLWbd7K7FOFCGsf0baCyikciNY3Yg== user@example.com",
    fingerprint: "SHA256:l3AUUMK6Q2BbuiqvMx2fs97f8LUYq7sWCAx7q5m3S6M",
  },
  {
    label: "sk-ed25519",
    algorithm: "sk-ssh-ed25519@openssh.com",
    line: "sk-ssh-ed25519@openssh.com AAAAGnNrLXNzaC1lZDI1NTE5QG9wZW5zc2guY29tAAAAICFo/k5LU8863u66YC9eUO2170QduohPURkQnbLa/dczAAAABHNzaDo= user@example.com",
    fingerprint: "SHA256:6WZVJ44bqhAWLVP4Ns0TDkoSQSsZo/h2K+mEvOaNFbw",
  },
  {
    label: "sk-ecdsa p256",
    algorithm: "sk-ecdsa-sha2-nistp256@openssh.com",
    line: "sk-ecdsa-sha2-nistp256@openssh.com AAAAInNrLWVjZHNhLXNoYTItbmlzdHAyNTZAb3BlbnNzaC5jb20AAAAIbmlzdHAyNTYAAABBBIELQJ2DgvaX1yQlKFokfWM2suuaCFI2qp0eJodHyg6O4ifxc3XpRKd1OS8dNYQtE/YjdXSrA+AOnMF5ns2Nkx4AAAAEc3NoOg== user@example.com",
    fingerprint: "SHA256:UINe2WXFh3SiqwLxsBv34fBO2ei+g7uOeJJXVEK95iE",
  },
];
