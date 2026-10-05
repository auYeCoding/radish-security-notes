import { describe, expect, it } from "vitest";

import {
  findSshPublicKeyAlgorithm,
  SSH_PUBLIC_KEY_ALGORITHMS,
} from "./ssh-public-key-algorithms";

describe("认得的公钥类型", () => {
  it("只有 OpenSSH 的 7 种非证书公钥类型, 算法名不重复", () => {
    const names = SSH_PUBLIC_KEY_ALGORITHMS.map((algorithm) => algorithm.name);
    expect(names).toEqual([
      "ssh-ed25519",
      "sk-ssh-ed25519@openssh.com",
      "ecdsa-sha2-nistp256",
      "ecdsa-sha2-nistp384",
      "ecdsa-sha2-nistp521",
      "sk-ecdsa-sha2-nistp256@openssh.com",
      "ssh-rsa",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("按算法名查找, 证书, DSA 与签名算法名都查不到", () => {
    expect(findSshPublicKeyAlgorithm("ssh-rsa")?.fieldCount).toBe(2);
    expect(findSshPublicKeyAlgorithm("ssh-ed25519-cert-v01@openssh.com")).toBe(
      undefined,
    );
    expect(findSshPublicKeyAlgorithm("ssh-dss")).toBe(undefined);
    expect(findSshPublicKeyAlgorithm("rsa-sha2-256")).toBe(undefined);
    expect(findSshPublicKeyAlgorithm("SSH-ED25519")).toBe(undefined);
  });
});
