import { describe, expect, it } from "vitest";

import {
  ED25519_PUBLIC_KEY_SAMPLE,
  SSH_PUBLIC_KEY_SAMPLES,
} from "../testing/ssh-public-key-samples";
import { asciiBytes, encodeSshWireFields } from "../testing/ssh-wire-fixture";
import { parseSshPublicKeyLine } from "./ssh-public-key-line";

/**
 * 样例里 ed25519 公钥的数据块文本.
 */
const ED25519_BLOB_TEXT = ED25519_PUBLIC_KEY_SAMPLE.line.split(" ")[1] ?? "";

/**
 * 样例里 ed25519 公钥的 32 字节密钥内容.
 */
const ED25519_KEY_BYTES = Buffer.alloc(32, 7);

/**
 * 拼一行以 ed25519 算法名开头的公钥, 数据块由给定字段拼成.
 * @param fields 数据块里依次排列的字段.
 * @returns 公钥一行.
 */
function ed25519LineOf(fields: readonly Buffer[]): string {
  return `ssh-ed25519 ${encodeSshWireFields(fields).toString("base64")}`;
}

describe("解析公钥一行: 能解析的写法", () => {
  it.each(SSH_PUBLIC_KEY_SAMPLES)(
    "$label: 带注释的一行得到算法名与数据块",
    (sample) => {
      const parsed = parseSshPublicKeyLine(sample.line);
      const blobText = sample.line.split(" ")[1];
      expect(parsed?.algorithm).toBe(sample.algorithm);
      expect(parsed?.blob.toString("base64")).toBe(blobText);
    },
  );

  it.each(SSH_PUBLIC_KEY_SAMPLES)("$label: 不带注释也能解析", (sample) => {
    const withoutComment = sample.line.split(" ").slice(0, 2).join(" ");
    expect(parseSshPublicKeyLine(withoutComment)?.algorithm).toBe(
      sample.algorithm,
    );
  });

  it("首尾空白, 制表符分隔与多个空格都能解析", () => {
    const padded = `\r\n  ssh-ed25519\t\t${ED25519_BLOB_TEXT}   comment\t\n`;
    expect(parseSshPublicKeyLine(padded)?.algorithm).toBe("ssh-ed25519");
  });

  it("注释里有空格与非 ASCII 字符也不影响", () => {
    const line = `ssh-ed25519 ${ED25519_BLOB_TEXT} 我的 笔记本 key`;
    expect(parseSshPublicKeyLine(line)?.algorithm).toBe("ssh-ed25519");
  });
});

/**
 * 无法解析的公钥一行, 每项是描述与文本.
 */
const INVALID_LINES: ReadonlyArray<readonly [string, string]> = [
  ["空串", ""],
  ["只有空白", "  \t "],
  ["只有算法名", "ssh-ed25519"],
  ["没有算法名", ED25519_BLOB_TEXT],
  ["算法名未知", `ssh-unknown ${ED25519_BLOB_TEXT}`],
  ["算法名大小写不同", `SSH-ED25519 ${ED25519_BLOB_TEXT}`],
  ["DSA", `ssh-dss ${ED25519_BLOB_TEXT}`],
  ["证书类型", `ssh-ed25519-cert-v01@openssh.com ${ED25519_BLOB_TEXT}`],
  ["签名算法名", `rsa-sha2-256 ${ED25519_BLOB_TEXT}`],
  ["行首算法名与数据块里的算法名不一致", `ssh-rsa ${ED25519_BLOB_TEXT}`],
  ["占位的短数据块", "ssh-ed25519 AAAA"],
  ["数据块里夹空白", "ssh-ed25519 AAAAC3Nz aC1lZDI1NTE5"],
  [
    "数据块用 URL 安全字母表",
    `ssh-ed25519 ${ED25519_BLOB_TEXT.replace("+", "-")}`,
  ],
  ["数据块缺补位", `ssh-ed25519 ${ED25519_BLOB_TEXT.replace(/=+$/, "")}x`],
  ["数据块后还有第二行", `${ED25519_PUBLIC_KEY_SAMPLE.line}\nssh-rsa AAAA`],
  ["注释里有换行", `ssh-ed25519 ${ED25519_BLOB_TEXT} a\nb`],
  ["数据块里只有算法名", ed25519LineOf([asciiBytes("ssh-ed25519")])],
  [
    "数据块里算法名之后的字段太多",
    ed25519LineOf([
      asciiBytes("ssh-ed25519"),
      ED25519_KEY_BYTES,
      ED25519_KEY_BYTES,
    ]),
  ],
  [
    "数据块里算法名之后的字段为空",
    ed25519LineOf([asciiBytes("ssh-ed25519"), Buffer.alloc(0)]),
  ],
  [
    "数据块里的算法名是别的算法",
    ed25519LineOf([asciiBytes("ssh-rsa"), ED25519_KEY_BYTES]),
  ],
  [
    "数据块末尾多出字节",
    `ssh-ed25519 ${Buffer.concat([
      encodeSshWireFields([asciiBytes("ssh-ed25519"), ED25519_KEY_BYTES]),
      Buffer.from([0]),
    ]).toString("base64")}`,
  ],
  [
    "数据块被截断",
    `ssh-ed25519 ${encodeSshWireFields([
      asciiBytes("ssh-ed25519"),
      ED25519_KEY_BYTES,
    ])
      .subarray(0, 20)
      .toString("base64")}`,
  ],
];

describe("解析公钥一行: 无法解析的写法", () => {
  it.each(INVALID_LINES)("%s", (_description, text) => {
    expect(parseSshPublicKeyLine(text)).toBeUndefined();
  });

  it("结构正确的数据块可以解析, 说明上面的失败来自各自的缺陷", () => {
    const line = ed25519LineOf([asciiBytes("ssh-ed25519"), ED25519_KEY_BYTES]);
    expect(parseSshPublicKeyLine(line)?.algorithm).toBe("ssh-ed25519");
  });
});
