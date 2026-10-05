import { insertEntry, type EntryRecord } from "../entries/entry-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  ED25519_PUBLIC_KEY_SAMPLE,
  SSH_PUBLIC_KEY_SAMPLES,
} from "./ssh-public-key-samples";

/**
 * 合成的私钥文本, 不是任何真实的密钥, 导出只原样搬运它, 不解析内容.
 */
export const SSH_FIXTURE_PRIVATE_KEY =
  "-----BEGIN SYNTHETIC KEY-----\nc3ludGhldGlj\n-----END SYNTHETIC KEY-----";

/**
 * 合成的密钥口令.
 */
export const SSH_FIXTURE_PASSPHRASE = "synthetic-key-passphrase";

/**
 * 能按 SSH 密钥导出的第一个条目的创建时间, 后面的条目依次加一.
 */
const VALID_FIRST_CREATED_AT = 1000;

/**
 * 被降级的第一个条目的创建时间, 后面的条目依次加一, 晚于所有能按 SSH 密钥导出的条目.
 */
const DOWNGRADED_FIRST_CREATED_AT = 2000;

/**
 * 一个 SSH 条目的规格: 编号, 相对默认字段要覆盖的字段, 备注.
 */
interface SshEntrySpec {
  /**
   * 条目编号.
   */
  readonly id: string;
  /**
   * 覆盖默认字段的取值.
   */
  readonly fieldOverrides: Readonly<Record<string, string>>;
  /**
   * 备注原文.
   */
  readonly notes: string;
}

/**
 * 默认的 SSH 字段取值: 私钥, 口令是合成值, 公钥由规格给出.
 */
const DEFAULT_SSH_FIELDS: Readonly<Record<string, string>> = {
  host: "10.0.0.1",
  port: "22",
  account: "deploy",
  privateKey: SSH_FIXTURE_PRIVATE_KEY,
  publicKey: ED25519_PUBLIC_KEY_SAMPLE.line,
  keyPassphrase: SSH_FIXTURE_PASSPHRASE,
};

/**
 * 能按 SSH 密钥导出的规格: 每种算法的样例公钥一条, 再加一条公钥前后带空白与换行的.
 */
const VALID_SPECS: readonly SshEntrySpec[] = [
  ...SSH_PUBLIC_KEY_SAMPLES.map((sample) => ({
    id: `ssh-valid-${sample.label}`,
    fieldOverrides: { publicKey: sample.line },
    notes: `备注 ${sample.label}`,
  })),
  {
    id: "ssh-valid-padded",
    fieldOverrides: { publicKey: `\n  ${ED25519_PUBLIC_KEY_SAMPLE.line}  \n` },
    notes: "公钥前后带空白",
  },
];

/**
 * 要被降级为登录的规格: 缺私钥, 私钥只有空白, 缺公钥, 公钥格式错误, 私钥公钥都缺.
 */
const DOWNGRADED_SPECS: readonly SshEntrySpec[] = [
  {
    id: "ssh-no-private",
    fieldOverrides: { privateKey: "" },
    notes: "缺私钥的备注",
  },
  {
    id: "ssh-blank-private",
    fieldOverrides: { privateKey: "  \n " },
    notes: "私钥只有空白的备注",
  },
  {
    id: "ssh-no-public",
    fieldOverrides: { publicKey: "" },
    notes: "缺公钥的备注",
  },
  {
    id: "ssh-bad-public",
    fieldOverrides: { publicKey: "ssh-ed25519 AAAA" },
    notes: "公钥格式错误的备注",
  },
  {
    id: "ssh-no-keys",
    fieldOverrides: { privateKey: "", publicKey: "" },
    notes: "私钥公钥都缺的备注",
  },
];

/**
 * 把规格变成条目行, 创建时间从给定值起依次加一.
 * @param specs 规格.
 * @param firstCreatedAt 第一个条目的创建时间.
 * @returns 条目行.
 */
function recordsOf(
  specs: readonly SshEntrySpec[],
  firstCreatedAt: number,
): readonly EntryRecord[] {
  return specs.map((spec, index) => ({
    id: spec.id,
    name: `名称 ${spec.id}`,
    type: "sshKey",
    fields: { ...DEFAULT_SSH_FIELDS, ...spec.fieldOverrides },
    notes: spec.notes,
    notesFormat: "plain",
    customFields: [],
    totp: null,
    folderId: null,
    createdAt: firstCreatedAt + index,
  }));
}

/**
 * 能按 SSH 密钥导出的合成条目, 按创建先后排列.
 */
export const VALID_SSH_ENTRIES: readonly EntryRecord[] = recordsOf(
  VALID_SPECS,
  VALID_FIRST_CREATED_AT,
);

/**
 * 要被降级为登录导出的合成条目, 按创建先后排列.
 */
export const DOWNGRADED_SSH_ENTRIES: readonly EntryRecord[] = recordsOf(
  DOWNGRADED_SPECS,
  DOWNGRADED_FIRST_CREATED_AT,
);

/**
 * 往库里写入合成的 SSH 条目.
 * @param orm 已解锁数据库的查询入口.
 * @param records 要写入的条目行, 默认是全部合成条目.
 */
export function seedSshEntries(
  orm: VaultOrm,
  records: readonly EntryRecord[] = [
    ...VALID_SSH_ENTRIES,
    ...DOWNGRADED_SSH_ENTRIES,
  ],
): void {
  records.forEach((record) => insertEntry(orm, record));
}
