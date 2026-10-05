import { describe, expect, it } from "vitest";

import {
  independentFingerprintOf,
  SSH_PUBLIC_KEY_SAMPLES,
} from "../../../testing/ssh-public-key-samples";
import type { ExportEntry } from "../../dataset/export-dataset";
import {
  exportableSshKeyOf,
  isDowngradedSshKey,
} from "./bitwarden-ssh-eligibility";

/**
 * 测试里任意写的私钥文本: 判定只看是否为空, 不解析内容.
 */
const ARBITRARY_PRIVATE_KEY = "not a real key at all";

/**
 * 样例里 ed25519 公钥的一行.
 */
const PUBLIC_KEY_LINE = SSH_PUBLIC_KEY_SAMPLES[0]?.line ?? "";

/**
 * 不能按 SSH 密钥导出的类型字段取值, 每项是描述与字段.
 */
const NOT_EXPORTABLE_CASES: ReadonlyArray<
  readonly [string, Readonly<Record<string, string>>]
> = [
  ["没有私钥字段", { publicKey: PUBLIC_KEY_LINE }],
  ["私钥为空串", { privateKey: "", publicKey: PUBLIC_KEY_LINE }],
  ["私钥只有空白", { privateKey: " \n\t ", publicKey: PUBLIC_KEY_LINE }],
  ["没有公钥字段", { privateKey: ARBITRARY_PRIVATE_KEY }],
  ["公钥为空串", { privateKey: ARBITRARY_PRIVATE_KEY, publicKey: "" }],
  ["公钥只有空白", { privateKey: ARBITRARY_PRIVATE_KEY, publicKey: "  \n " }],
  [
    "公钥无法解析",
    { privateKey: ARBITRARY_PRIVATE_KEY, publicKey: "ssh-ed25519 AAAA" },
  ],
  ["私钥公钥都没有", {}],
];

/**
 * 构造一个只带类型字段的条目.
 * @param fields 类型字段取值.
 * @param typeKey 条目的类型键, 默认是 SSH 密钥.
 * @returns 条目.
 */
function entryOf(
  fields: Readonly<Record<string, string>>,
  typeKey = "sshKey",
): ExportEntry {
  return {
    id: "entry-1",
    typeKey,
    name: "名称",
    fields,
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: undefined,
    folderId: undefined,
    tagIds: [],
    createdAt: 0,
    attachments: [],
  };
}

describe("判定 SSH 密钥条目能否按 SSH 密钥导出", () => {
  it.each(SSH_PUBLIC_KEY_SAMPLES)(
    "$label: 私钥非空且公钥能解析时给出私钥, 公钥原文与独立算出的指纹",
    (sample) => {
      const exportable = exportableSshKeyOf(
        entryOf({ privateKey: ARBITRARY_PRIVATE_KEY, publicKey: sample.line }),
      );
      expect(exportable).toEqual({
        privateKey: ARBITRARY_PRIVATE_KEY,
        publicKey: sample.line,
        keyFingerprint: independentFingerprintOf(sample.line),
      });
    },
  );

  it("私钥公钥都原样给出, 不去掉首尾空白", () => {
    const privateKey = `\n${ARBITRARY_PRIVATE_KEY}\n`;
    const publicKey = `  ${PUBLIC_KEY_LINE}\t\n`;
    const exportable = exportableSshKeyOf(entryOf({ privateKey, publicKey }));
    expect(exportable?.privateKey).toBe(privateKey);
    expect(exportable?.publicKey).toBe(publicKey);
  });
});

describe("判定 SSH 密钥条目被降级", () => {
  it.each(NOT_EXPORTABLE_CASES)(
    "%s: 不能按 SSH 密钥导出, 判为被降级",
    (_name, fields) => {
      const entry = entryOf(fields);
      expect(exportableSshKeyOf(entry)).toBeUndefined();
      expect(isDowngradedSshKey(entry)).toBe(true);
    },
  );

  it("能导出的 SSH 密钥条目没有被降级", () => {
    const entry = entryOf({
      privateKey: ARBITRARY_PRIVATE_KEY,
      publicKey: PUBLIC_KEY_LINE,
    });
    expect(isDowngradedSshKey(entry)).toBe(false);
  });

  it("其它类型的条目不算被降级, 哪怕没有私钥与公钥", () => {
    expect(isDowngradedSshKey(entryOf({}, "login"))).toBe(false);
    expect(isDowngradedSshKey(entryOf({}, "custom:type-1"))).toBe(false);
  });
});
