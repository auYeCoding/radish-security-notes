import { describe, expect, it } from "vitest";

import {
  exportSeededAsBitwarden,
  FULL_EXPORT_OPTIONS,
  type LooseDocument,
  type LooseField,
  type LooseItem,
} from "../../../testing/bitwarden-export-fixture";
import type { EntryRecord } from "../../../entries/entry-repository";
import {
  DOWNGRADED_SSH_ENTRIES,
  seedSshEntries,
  SSH_FIXTURE_PASSPHRASE,
  SSH_FIXTURE_PRIVATE_KEY,
  VALID_SSH_ENTRIES,
} from "../../../testing/ssh-export-fixture";
import {
  independentFingerprintOf,
  SSH_PUBLIC_KEY_SAMPLES,
} from "../../../testing/ssh-public-key-samples";
import { useVaultDatabase } from "../../../testing/use-vault-database";

/**
 * Bitwarden 自定义字段类型: 文本.
 */
const FIELD_TEXT = 0;

/**
 * Bitwarden 自定义字段类型: 隐藏.
 */
const FIELD_HIDDEN = 1;

/**
 * 降级为登录时写成自定义字段的类型字段键, 顺序与 SSH 预设类型一致; 账号进登录用户名.
 */
const DOWNGRADED_FIELD_KEYS = [
  "host",
  "port",
  "privateKey",
  "publicKey",
  "keyPassphrase",
] as const;

/**
 * 降级为登录时写成隐藏字段的类型字段键.
 */
const HIDDEN_FIELD_KEYS: ReadonlySet<string> = new Set([
  "privateKey",
  "keyPassphrase",
]);

/**
 * 按条目编号找导出文档里的条目.
 * @param document 导出文档.
 * @param id 条目编号.
 * @returns 条目.
 * @throws Error 当文档里没有这个条目时.
 */
function itemOf(document: LooseDocument, id: string): LooseItem {
  const item = document.items.find((candidate) => candidate.id === id);
  if (item === undefined) {
    throw new Error(`导出文档里没有条目 ${id}`);
  }
  return item;
}

/**
 * 读条目行里的一个类型字段.
 * @param record 条目行.
 * @param key 字段键.
 * @returns 字段值, 没有时为空串.
 */
function fieldOf(record: EntryRecord, key: string): string {
  return record.fields[key] ?? "";
}

/**
 * 降级为登录的条目应有的自定义字段: 非空的类型字段, 私钥与口令隐藏, 字段名取 `label:字段键`.
 * @param record 条目行.
 * @returns 应有的自定义字段.
 */
function expectedDowngradedFields(record: EntryRecord): LooseField[] {
  return DOWNGRADED_FIELD_KEYS.filter((key) => fieldOf(record, key) !== "").map(
    (key) => ({
      name: `label:${key}`,
      value: fieldOf(record, key),
      type: HIDDEN_FIELD_KEYS.has(key) ? FIELD_HIDDEN : FIELD_TEXT,
      linkedId: null,
    }),
  );
}

describe("Bitwarden JSON: 能按 SSH 密钥导出的条目的密钥内容", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-ssh-valid");

  it("导出为 SSH 密钥类型, 私钥, 公钥, 指纹都非空, 指纹等于独立算出的值", async () => {
    seedSshEntries(getDatabase().orm);
    const { document } = await exportSeededAsBitwarden(getDatabase().orm);
    for (const record of VALID_SSH_ENTRIES) {
      const item = itemOf(document, record.id);
      expect(item.type).toBe(5);
      expect(item.sshKey).toEqual({
        privateKey: SSH_FIXTURE_PRIVATE_KEY,
        publicKey: fieldOf(record, "publicKey"),
        keyFingerprint: independentFingerprintOf(fieldOf(record, "publicKey")),
      });
    }
  });

  it("每种算法的指纹都等于来源给出的值", async () => {
    seedSshEntries(getDatabase().orm);
    const { document } = await exportSeededAsBitwarden(getDatabase().orm);
    for (const sample of SSH_PUBLIC_KEY_SAMPLES) {
      const item = itemOf(document, `ssh-valid-${sample.label}`);
      expect(item.sshKey?.keyFingerprint).toBe(sample.fingerprint);
    }
  });

  it("公钥前后的空白原样保留, 指纹不受影响", async () => {
    seedSshEntries(getDatabase().orm);
    const { document } = await exportSeededAsBitwarden(getDatabase().orm);
    const padded = itemOf(document, "ssh-valid-padded");
    const plain = itemOf(document, "ssh-valid-ed25519");
    expect(padded.sshKey?.publicKey).toMatch(/^\n {2}ssh-ed25519 .* {2}\n$/);
    expect(padded.sshKey?.keyFingerprint).toBe(plain.sshKey?.keyFingerprint);
  });
});

describe("Bitwarden JSON: 能按 SSH 密钥导出的条目的其余内容", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-ssh-valid-rest");

  it("主机, 端口, 账号, 密钥口令写成自定义字段, 口令隐藏, 备注保留", async () => {
    seedSshEntries(getDatabase().orm);
    const { document } = await exportSeededAsBitwarden(getDatabase().orm);
    for (const record of VALID_SSH_ENTRIES) {
      const item = itemOf(document, record.id);
      expect(item.fields).toEqual([
        { name: "label:host", value: "10.0.0.1", type: 0, linkedId: null },
        { name: "label:port", value: "22", type: 0, linkedId: null },
        { name: "label:account", value: "deploy", type: 0, linkedId: null },
        {
          name: "label:keyPassphrase",
          value: SSH_FIXTURE_PASSPHRASE,
          type: 1,
          linkedId: null,
        },
      ]);
      expect(item.notes).toBe(record.notes);
    }
  });

  it("全部条目都能按 SSH 密钥导出时, 汇总里没有降级项", async () => {
    seedSshEntries(getDatabase().orm, VALID_SSH_ENTRIES);
    const { payload } = await exportSeededAsBitwarden(getDatabase().orm);
    expect(payload.losses).toEqual([]);
  });
});

describe("Bitwarden JSON: 被降级为登录的 SSH 条目", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-ssh-downgraded");

  it("导出为登录, 没有 SSH 密钥部分, 账号进用户名, 备注保留", async () => {
    seedSshEntries(getDatabase().orm);
    const { document } = await exportSeededAsBitwarden(getDatabase().orm);
    for (const record of DOWNGRADED_SSH_ENTRIES) {
      const item = itemOf(document, record.id);
      expect(item.type).toBe(1);
      expect("sshKey" in item).toBe(false);
      expect(item.login).toMatchObject({
        username: "deploy",
        password: null,
        uris: [],
      });
      expect(item.notes).toBe(record.notes);
    }
  });

  it("主机, 端口, 私钥, 公钥, 密钥口令写成自定义字段, 私钥与口令隐藏, 空值省略, 内容不丢", async () => {
    seedSshEntries(getDatabase().orm);
    const { document } = await exportSeededAsBitwarden(getDatabase().orm);
    for (const record of DOWNGRADED_SSH_ENTRIES) {
      expect(itemOf(document, record.id).fields).toEqual(
        expectedDowngradedFields(record),
      );
    }
  });

  it("缺私钥的条目仍带着公钥与口令, 不整条跳过", async () => {
    seedSshEntries(getDatabase().orm);
    const { document } = await exportSeededAsBitwarden(getDatabase().orm);
    const names = itemOf(document, "ssh-no-private").fields?.map(
      (field) => field.name,
    );
    expect(names).toEqual([
      "label:host",
      "label:port",
      "label:publicKey",
      "label:keyPassphrase",
    ]);
  });

  it("汇总按降级的条目数列出新的带不出原因", async () => {
    seedSshEntries(getDatabase().orm);
    const { payload } = await exportSeededAsBitwarden(getDatabase().orm);
    expect(payload.losses).toEqual([
      { reason: "downgradedSshKeys", count: DOWNGRADED_SSH_ENTRIES.length },
    ]);
  });
});

describe("Bitwarden JSON: 整份文件符合官方导入器的要求", () => {
  const getDatabase = useVaultDatabase("export-bitwarden-ssh-importer");

  it("没有私钥, 公钥或指纹为空的 SSH 密钥条目, 所有条目都在", async () => {
    seedSshEntries(getDatabase().orm);
    const { document } = await exportSeededAsBitwarden(getDatabase().orm);
    const sshItems = document.items.filter((item) => item.type === 5);
    expect(sshItems).toHaveLength(VALID_SSH_ENTRIES.length);
    for (const item of sshItems) {
      for (const key of ["privateKey", "publicKey", "keyFingerprint"]) {
        expect(String(item.sshKey?.[key] ?? "").trim()).not.toBe("");
      }
    }
    expect(document.items).toHaveLength(
      VALID_SSH_ENTRIES.length + DOWNGRADED_SSH_ENTRIES.length,
    );
  });

  it("不含保密字段时私钥被置空, 全部 SSH 条目降级为登录, 私钥与口令不在输出里", async () => {
    seedSshEntries(getDatabase().orm);
    const { document, text, payload } = await exportSeededAsBitwarden(
      getDatabase().orm,
      { ...FULL_EXPORT_OPTIONS, includeSecrets: false },
    );
    expect(document.items.filter((item) => item.type === 5)).toEqual([]);
    expect(document.items.every((item) => item.type === 1)).toBe(true);
    expect(text).not.toContain(SSH_FIXTURE_PRIVATE_KEY);
    expect(text).not.toContain(SSH_FIXTURE_PASSPHRASE);
    expect(payload.losses).toEqual([
      {
        reason: "downgradedSshKeys",
        count: VALID_SSH_ENTRIES.length + DOWNGRADED_SSH_ENTRIES.length,
      },
    ]);
  });
});
