import { describe, expect, it } from "vitest";

import {
  independentFingerprintOf,
  SSH_PUBLIC_KEY_SAMPLES,
} from "../testing/ssh-public-key-samples";
import { fingerprintOfSshPublicKey } from "./ssh-key-fingerprint";
import {
  parseSshPublicKeyLine,
  type SshPublicKey,
} from "./ssh-public-key-line";

/**
 * 解析样例公钥, 解析不出时让测试失败.
 * @param line 公钥一行.
 * @returns 解析好的公钥.
 * @throws Error 当公钥无法解析时.
 */
function parseOrThrow(line: string): SshPublicKey {
  const parsed = parseSshPublicKeyLine(line);
  if (parsed === undefined) {
    throw new Error("样例公钥无法解析");
  }
  return parsed;
}

describe("公钥指纹", () => {
  it.each(SSH_PUBLIC_KEY_SAMPLES)(
    "$label: 等于来源给出的指纹, 也等于独立算出的值",
    (sample) => {
      const fingerprint = fingerprintOfSshPublicKey(parseOrThrow(sample.line));
      expect(fingerprint).toBe(sample.fingerprint);
      expect(fingerprint).toBe(independentFingerprintOf(sample.line));
    },
  );

  it("指纹不含补位字符, 前缀是 SHA256 加冒号", () => {
    for (const sample of SSH_PUBLIC_KEY_SAMPLES) {
      const fingerprint = fingerprintOfSshPublicKey(parseOrThrow(sample.line));
      expect(fingerprint.startsWith("SHA256:")).toBe(true);
      expect(fingerprint.endsWith("=")).toBe(false);
    }
  });

  it("注释与首尾空白不改变指纹", () => {
    const sample = SSH_PUBLIC_KEY_SAMPLES[0];
    const blobText = sample?.line.split(" ")[1] ?? "";
    const plain = parseOrThrow(`ssh-ed25519 ${blobText}`);
    const decorated = parseOrThrow(`  ssh-ed25519\t${blobText} 别的注释\n`);
    expect(fingerprintOfSshPublicKey(decorated)).toBe(
      fingerprintOfSshPublicKey(plain),
    );
  });
});
