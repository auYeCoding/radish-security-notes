import { describe, expect, it } from "vitest";

import {
  expectProblems,
  failureAfter,
  loadSampleBackup,
  type ProblemCase,
} from "../testing/restore-sample-backup";
import { useVaultDatabase } from "../testing/use-vault-database";

/**
 * 文件夹的不合规: 编号重复, 名称重名 (忽略 A-Z 大小写), 名称为空, 带首尾空格或过长.
 */
const FOLDER_CASES: readonly ProblemCase[] = [
  {
    set: { "vault.folders.2.id": "folder-work" },
    code: "duplicate-id",
    position: 3,
  },
  {
    set: { "vault.folders.1.name": "工作" },
    code: "duplicate-name",
    position: 2,
  },
  {
    set: { "vault.folders.0.name": "HOME" },
    code: "duplicate-name",
    position: 2,
  },
  { set: { "vault.folders.0.name": "" }, code: "invalid-value", position: 1 },
  {
    set: { "vault.folders.0.name": " 工作" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.folders.0.name": "x".repeat(51) },
    code: "invalid-value",
    position: 1,
  },
];

/**
 * 标签的不合规: 编号重复, 名称重名 (忽略 A-Z 大小写), 名称全是空格或过长.
 */
const TAG_CASES: readonly ProblemCase[] = [
  { set: { "vault.tags.2.id": "tag-key" }, code: "duplicate-id", position: 3 },
  { set: { "vault.tags.1.name": "重要" }, code: "duplicate-name", position: 2 },
  {
    set: { "vault.tags.0.name": "A", "vault.tags.1.name": "a" },
    code: "duplicate-name",
    position: 2,
  },
  { set: { "vault.tags.0.name": "  " }, code: "invalid-value", position: 1 },
  {
    set: { "vault.tags.0.name": "y".repeat(51) },
    code: "invalid-value",
    position: 1,
  },
];

/**
 * 自定义类型自身的不合规: 编号重复, 名称重名, 类型键与编号不对应.
 */
const TYPE_CASES: readonly ProblemCase[] = [
  {
    set: { "vault.customEntryTypes.1.id": "type-1" },
    code: "duplicate-id",
    position: 2,
  },
  {
    set: { "vault.customEntryTypes.1.name": "路由器" },
    code: "duplicate-name",
    position: 2,
  },
  {
    set: { "vault.customEntryTypes.0.key": "custom:other" },
    code: "invalid-value",
    position: 1,
  },
];

/**
 * 自定义类型字段的不合规: 字段键不合规或重复, 没有字段, 字段名重复, 摘要字段保密, 字段名带空格.
 */
const FIELD_CASES: readonly ProblemCase[] = [
  {
    set: { "vault.customEntryTypes.0.fields.1.key": "bad-key" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.customEntryTypes.0.fields.2.key": "field-type-2" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.customEntryTypes.0.fields": [] },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.customEntryTypes.0.fields.2.name": "口令" },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.customEntryTypes.0.fields.0.isSensitive": true },
    code: "invalid-value",
    position: 1,
  },
  {
    set: { "vault.customEntryTypes.0.fields.0.name": " 地址" },
    code: "invalid-value",
    position: 1,
  },
];

describe("备份校验: 文件夹", () => {
  const getDatabase = useVaultDatabase("restore-validator-folders");

  it("编号重复, 名称重名或名称不合规时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    expectProblems(base, "folders", FOLDER_CASES);
  });
});

describe("备份校验: 标签", () => {
  const getDatabase = useVaultDatabase("restore-validator-tags");

  it("编号重复, 名称重名或名称不合规时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    expectProblems(base, "tags", TAG_CASES);
  });

  it("A-Z 以外的字母区分大小写, 不算重名", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    const failure = failureAfter(base, (b) => {
      b.vault.tags[0].name = "É";
      b.vault.tags[1].name = "é";
    });

    expect(failure).toBeUndefined();
  });
});

describe("备份校验: 自定义类型", () => {
  const getDatabase = useVaultDatabase("restore-validator-types");

  it("类型编号重复, 名称重名或类型键与编号不对应时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    expectProblems(base, "customTypes", TYPE_CASES);
  });

  it("字段键不合规或重复, 没有字段, 字段名重复, 摘要字段保密时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);

    expectProblems(base, "customTypes", FIELD_CASES);
  });
});

describe("备份校验: 自定义类型个数上限", () => {
  const getDatabase = useVaultDatabase("restore-validator-type-limit");

  it("超过个数上限时整体拒绝", async () => {
    const base = await loadSampleBackup(getDatabase().orm);
    const field = {
      key: "account",
      name: "甲",
      kind: "singleLine",
      isSensitive: false,
    };

    const failure = failureAfter(base, (b) => {
      for (let index = 0; index < 49; index += 1) {
        const id = `extra-${index}`;
        const name = `类型 ${index}`;
        b.vault.customEntryTypes.push({
          id,
          key: `custom:${id}`,
          name,
          fields: [field],
        });
      }
    });

    expect(failure).toEqual({
      ok: false,
      reason: "invalid-content",
      problem: { section: "customTypes", code: "invalid-value", position: 51 },
    });
  });
});
