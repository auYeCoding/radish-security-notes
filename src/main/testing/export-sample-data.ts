import { insertAttachmentContent } from "../attachments/attachment-content-repository";
import { insertAttachmentRow } from "../attachments/attachment-repository";
import { insertEntry, type EntryRecord } from "../entries/entry-repository";
import {
  insertCustomEntryType,
  type CustomEntryTypeRows,
} from "../entry-types/custom-entry-type-repository";
import { insertFolder, type FolderRecord } from "../folders/folder-repository";
import { replaceEntryTags } from "../tags/entry-tag-repository";
import { insertTag, type TagRecord } from "../tags/tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * RFC 6238 附录 B 的 SHA1 种子的 Base32 形式, 样例里的 TOTP 密钥.
 */
export const SAMPLE_TOTP_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

/**
 * 样例登录条目的密码, 含逗号, 引号与换行.
 */
export const SAMPLE_LOGIN_PASSWORD = 'p@ss,"word"\nsecond-line';

/**
 * 样例里非 ASCII 名称的附件内容.
 */
export const SAMPLE_PDF_BYTES = Buffer.from(
  "%PDF-样例内容-".repeat(80),
  "utf8",
);

/**
 * 样例里二进制附件的内容, 含全部字节值.
 */
export const SAMPLE_BINARY_BYTES = Buffer.from(
  Array.from({ length: 256 }, (_unused, index) => index),
);

/**
 * 样例里第三个附件的内容.
 */
export const SAMPLE_CONFIG_BYTES = Buffer.from("cfg");

/**
 * 样例里每个附件的编号与内容, 序列化测试用它充当 "库里的附件内容".
 */
export const SAMPLE_ATTACHMENT_CONTENTS: ReadonlyMap<string, Buffer> = new Map([
  ["att-1", SAMPLE_PDF_BYTES],
  ["att-2", SAMPLE_BINARY_BYTES],
  ["att-3", SAMPLE_CONFIG_BYTES],
]);

/**
 * 样例里自定义类型 "路由器" 的类型键.
 */
export const SAMPLE_ROUTER_TYPE_KEY = "custom:type-1";

/**
 * 样例条目的编号, 按创建先后排列.
 */
export const SAMPLE_ENTRY_IDS = {
  login: "entry-login",
  forum: "entry-forum",
  bankCard: "entry-card",
  identity: "entry-identity",
  secureNote: "entry-note",
  sshKey: "entry-ssh",
  router: "entry-router",
  wifi: "entry-wifi",
} as const;

/**
 * 样例里没有任何条目用到的文件夹, 标签与自定义类型的编号, 导出子集时它们不应出现.
 */
export const SAMPLE_UNUSED_IDS = {
  folder: "folder-unused",
  tag: "tag-unused",
  customType: "type-unused",
} as const;

/**
 * 样例的文件夹.
 */
const SAMPLE_FOLDERS: readonly FolderRecord[] = [
  { id: "folder-work", name: "工作", createdAt: 10 },
  { id: "folder-home", name: "Home", createdAt: 20 },
  { id: SAMPLE_UNUSED_IDS.folder, name: "没人用", createdAt: 30 },
];

/**
 * 样例的标签.
 */
const SAMPLE_TAGS: readonly TagRecord[] = [
  { id: "tag-key", name: "重要", color: "red", createdAt: 10 },
  { id: "tag-daily", name: "daily", color: "blue", createdAt: 20 },
  { id: SAMPLE_UNUSED_IDS.tag, name: "闲置", color: "slate", createdAt: 30 },
];

/**
 * 样例的自定义类型: 用到的 "路由器" 与没人用的 "闲置类型".
 */
const SAMPLE_CUSTOM_TYPES: readonly CustomEntryTypeRows[] = [
  {
    type: { id: "type-1", name: "路由器", createdAt: 10 },
    fields: [
      {
        typeId: "type-1",
        key: "account",
        position: 0,
        name: "地址",
        kind: "singleLine",
        isSensitive: false,
      },
      {
        typeId: "type-1",
        key: "field-type-2",
        position: 1,
        name: "口令",
        kind: "singleLine",
        isSensitive: true,
      },
      {
        typeId: "type-1",
        key: "field-type-3",
        position: 2,
        name: "说明",
        kind: "multiLine",
        isSensitive: false,
      },
    ],
  },
  {
    type: { id: SAMPLE_UNUSED_IDS.customType, name: "闲置类型", createdAt: 20 },
    fields: [
      {
        typeId: SAMPLE_UNUSED_IDS.customType,
        key: "account",
        position: 0,
        name: "甲",
        kind: "singleLine",
        isSensitive: false,
      },
    ],
  },
];

/**
 * 构造一个样例条目行, 没有给出的部分取空值.
 * @param record 要覆盖的部分, 编号, 名称, 类型与创建时间必须给出.
 * @returns 条目行.
 */
function entryOf(
  record: Pick<EntryRecord, "id" | "name" | "type" | "createdAt"> &
    Partial<EntryRecord>,
): EntryRecord {
  return {
    fields: {},
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: null,
    folderId: null,
    ...record,
  };
}

/**
 * 样例的条目, 按创建先后排列: 登录, 论坛, 银行卡, 身份, 安全笔记, SSH 密钥, 自定义类型的路由器, WiFi.
 */
const SAMPLE_ENTRIES: readonly EntryRecord[] = [
  entryOf({
    id: SAMPLE_ENTRY_IDS.login,
    name: "示例登录, 含逗号",
    type: "login",
    createdAt: 1000,
    fields: {
      account: "alice@example.com",
      password: SAMPLE_LOGIN_PASSWORD,
      url: "https://example.com/login",
    },
    notes: "备注, 含逗号\n第二行",
    customFields: [
      { id: "cf-1", label: "密保问题", value: "答案", isHidden: false },
      { id: "cf-2", label: "PIN", value: "9527", isHidden: true },
    ],
    totp: {
      secret: SAMPLE_TOTP_SECRET,
      algorithm: "SHA1",
      digits: 6,
      periodSeconds: 30,
    },
    folderId: "folder-work",
  }),
  entryOf({
    id: SAMPLE_ENTRY_IDS.forum,
    name: "论坛",
    type: "forum",
    createdAt: 2000,
    fields: {
      account: "bob",
      password: "forum-secret",
      email: "bob@example.org",
      url: "https://forum.example.org",
    },
    notes: "# 标题\n\n- 一\n- 二",
    notesFormat: "markdown",
    totp: {
      secret: SAMPLE_TOTP_SECRET,
      algorithm: "SHA256",
      digits: 8,
      periodSeconds: 60,
    },
  }),
  entryOf({
    id: SAMPLE_ENTRY_IDS.bankCard,
    name: "招商银行卡",
    type: "bankCard",
    createdAt: 3000,
    fields: {
      cardholder: "张三",
      bankName: "招商银行",
      cardNumber: "6225880123456789",
      expiry: "08/29",
      securityCode: "123",
      cardPin: "4321",
    },
    folderId: "folder-home",
  }),
  entryOf({
    id: SAMPLE_ENTRY_IDS.identity,
    name: "身份证",
    type: "identity",
    createdAt: 4000,
    fields: {
      fullName: "李 四",
      email: "li@example.com",
      phone: "13800000000",
      documentNumber: "110101199001011234",
      address: "北京市\n朝阳区",
    },
  }),
  entryOf({
    id: SAMPLE_ENTRY_IDS.secureNote,
    name: "笔记",
    type: "secureNote",
    createdAt: 5000,
    fields: { content: "正文第一行\n正文第二行" },
    notes: "附加备注",
  }),
  entryOf({
    id: SAMPLE_ENTRY_IDS.sshKey,
    name: "服务器密钥",
    type: "sshKey",
    createdAt: 6000,
    fields: {
      host: "10.0.0.1",
      port: "22",
      account: "root",
      privateKey: "-----BEGIN KEY-----\nabc\n-----END KEY-----",
      publicKey: "ssh-ed25519 AAAA",
      keyPassphrase: "key-pass",
    },
  }),
  entryOf({
    id: SAMPLE_ENTRY_IDS.router,
    name: "家里路由器",
    type: SAMPLE_ROUTER_TYPE_KEY,
    createdAt: 7000,
    fields: {
      account: "192.168.1.1",
      "field-type-2": "router-secret",
      "field-type-3": "机房左侧\n第二行",
    },
    folderId: "folder-home",
  }),
  entryOf({
    id: SAMPLE_ENTRY_IDS.wifi,
    name: "家里 WiFi",
    type: "wifi",
    createdAt: 8000,
    fields: {
      networkName: "Home-5G",
      networkPassword: "wifi-secret",
      securityKind: "WPA3",
    },
  }),
];

/**
 * 样例的附件: 编号, 所属条目, 名称, 添加顺序与内容.
 */
const SAMPLE_ATTACHMENTS = [
  ["att-1", SAMPLE_ENTRY_IDS.login, "报告 final.pdf", 0],
  ["att-2", SAMPLE_ENTRY_IDS.login, "data.bin", 1],
  ["att-3", SAMPLE_ENTRY_IDS.router, "config.txt", 0],
] as const;

/**
 * 写入样例的文件夹, 标签与自定义类型.
 * @param orm 已解锁数据库的查询入口.
 */
function seedLabels(orm: VaultOrm): void {
  SAMPLE_FOLDERS.forEach((folder) => insertFolder(orm, folder));
  SAMPLE_TAGS.forEach((tag) => insertTag(orm, tag));
  SAMPLE_CUSTOM_TYPES.forEach((rows) => insertCustomEntryType(orm, rows));
}

/**
 * 写入样例的标签关联与附件: 登录带两个标签与两个附件, 路由器带一个标签与一个附件.
 * @param orm 已解锁数据库的查询入口.
 */
function seedLinks(orm: VaultOrm): void {
  replaceEntryTags(orm, SAMPLE_ENTRY_IDS.login, ["tag-key", "tag-daily"]);
  replaceEntryTags(orm, SAMPLE_ENTRY_IDS.router, ["tag-daily"]);
  for (const [id, entryId, name, position] of SAMPLE_ATTACHMENTS) {
    const content = SAMPLE_ATTACHMENT_CONTENTS.get(id) ?? Buffer.alloc(0);
    insertAttachmentRow(orm, {
      id,
      entryId,
      name,
      size: content.length,
      position,
    });
    insertAttachmentContent(orm, id, content);
  }
}

/**
 * 在空的已解锁数据库里写入导出测试用的合成样例: 3 个文件夹 (其中 1 个没人用), 3 个标签 (其中 1 个
 * 没人用), 2 个自定义类型 (其中 1 个没人用), 8 个条目 (含各类字段, 两种备注格式, 自定义字段,
 * 默认与非默认参数的 TOTP, 隐藏字段), 3 个附件 (含非 ASCII 名称与全字节值内容). 全是合成数据.
 * @param orm 已解锁数据库的查询入口.
 */
export function seedExportSample(orm: VaultOrm): void {
  seedLabels(orm);
  SAMPLE_ENTRIES.forEach((entry) => insertEntry(orm, entry));
  seedLinks(orm);
}
