import { describe, expect, it } from "vitest";

import { ENTRY_ACCOUNT_MAX_LENGTH } from "@shared/entries/common-entry-fields";

import type { ParsedJson } from "../testing/native-export-fixture";
import {
  expectProblems,
  failureAfter,
  loadSampleBackup,
  type ProblemCase,
  type SampleBackup,
} from "../testing/restore-sample-backup";
import { useVaultDatabase } from "../testing/use-vault-database";

/**
 * 样本里的第一个条目: 带 TOTP, 两个自定义字段, 文件夹 "工作", 两个标签与两个附件的登录条目.
 * @param backup 备份样本.
 * @returns 第一个条目.
 */
function first(backup: SampleBackup): ParsedJson {
  return backup.vault.entries[0];
}

/**
 * 条目的编号, 类型与引用不合规.
 */
const REFERENCE_CASES: readonly ProblemCase[] = [
  {
    set: { "vault.entries.1.id": { copyFrom: "vault.entries.0.id" } },
    code: "duplicate-id",
    position: 2,
  },
  {
    set: { "vault.entries.0.type": "nope" },
    code: "unknown-reference",
    position: 1,
  },
  {
    set: { "vault.entries.0.type": "custom:missing" },
    code: "unknown-reference",
    position: 1,
  },
  {
    set: { "vault.entries.0.folderId": "missing" },
    code: "unknown-reference",
    position: 1,
  },
  {
    set: { "vault.entries.0.tagIds": ["missing"] },
    code: "unknown-reference",
    position: 1,
  },
];

/**
 * 条目名称, 类型字段与自定义字段不合规.
 */
const CONTENT_CASES: readonly ProblemCase[] = [
  { set: { "vault.entries.0.name": "" }, code: "invalid-value", position: 1 },
  {
    set: { "vault.entries.0.name": "n".repeat(101) },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.name": " 示例" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: {
      "vault.entries.0.fields.account": "a".repeat(
        ENTRY_ACCOUNT_MAX_LENGTH + 1,
      ),
    },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.customFields.0.label": " " },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.customFields.0.label": " 密保问题" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: {
      "vault.entries.0.customFields.1.id": {
        copyFrom: "vault.entries.0.customFields.0.id",
      },
    },
    code: "invalid-value",
    position: 1,
  },
];

/**
 * TOTP 不合规: 密钥不是规范的 Base32, 周期不在允许范围内.
 */
const TOTP_CASES: readonly ProblemCase[] = [
  {
    set: { "vault.entries.0.totp.secret": "not base32!!" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.totp.secret": "gezdgnbv" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.totp.periodSeconds": 0 },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.entries.0.totp.periodSeconds": 3601 },
    code: "invalid-value",
    position: 1,
  },
];

describe("备份校验: 条目的引用", () => {
  const getDatabase = useVaultDatabase("restore-validator-entry-refs");

  it("编号重复, 类型不存在或引用不存在的内容时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    expectProblems(base, "entries", REFERENCE_CASES);
  });
});

describe("备份校验: 条目的内容", () => {
  const getDatabase = useVaultDatabase("restore-validator-entry-content");

  it("名称, 类型字段与自定义字段不合规时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    expectProblems(base, "entries", CONTENT_CASES);
  });

  it("TOTP 密钥不是规范的 Base32, 或周期不在允许范围内时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    expectProblems(base, "entries", TOTP_CASES);
  });
});

describe("备份校验: 条目的标签", () => {
  const getDatabase = useVaultDatabase("restore-validator-entry-tags");

  it("标签重复时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      first(b).tagIds = ["tag-key", "tag-key"];
    });

    expect(failure).toMatchObject({
      problem: { section: "entries", code: "invalid-value" },
    });
  });

  it("标签超过每条目上限时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      for (let index = 0; index < 9; index += 1) {
        b.vault.tags.push({
          id: `more-${index}`,
          name: `更多 ${index}`,
          color: "red",
        });
      }
      first(b).tagIds = b.vault.tags.map((tag: ParsedJson) => tag.id);
    });

    expect(failure).toMatchObject({
      problem: { section: "entries", code: "invalid-value" },
    });
  });
});

describe("备份校验: 与应用自己保存的数据一致的情形照常通过", () => {
  const getDatabase = useVaultDatabase("restore-validator-entry-lenient");

  it("条目可以缺类型字段, 也可以带类型之外的过期键", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      delete first(b).fields.url;
      first(b).fields["stale-key"] = "过期值";
    });

    expect(failure).toBeUndefined();
  });

  it("条目没有 TOTP, 没有文件夹与标签也合规", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      first(b).totp = null;
      first(b).folderId = null;
      first(b).tagIds = [];
    });

    expect(failure).toBeUndefined();
  });
});
