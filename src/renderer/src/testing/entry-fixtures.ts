import { readAccount, type EntryDetail } from "@shared/entries/entry-types";
import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

/**
 * 测试用的论坛条目, 通用登录类型, 网址, 备注与自定义字段都为空, 不带 TOTP.
 */
export const FORUM_ENTRY: EntryDetail = {
  id: "forum",
  name: "论坛",
  type: "login",
  account: "forum-account",
  fields: { account: "forum-account", password: "forum-password", url: "" },
  notes: "",
  notesFormat: "plain",
  customFields: [],
  hasTotp: false,
};

/**
 * 测试用的银行条目, 通用登录类型, 网址, 备注与自定义字段都为空, 不带 TOTP.
 */
export const BANK_ENTRY: EntryDetail = {
  id: "bank",
  name: "银行",
  type: "login",
  account: "bank-account",
  fields: { account: "bank-account", password: "bank-password", url: "" },
  notes: "",
  notesFormat: "plain",
  customFields: [],
  hasTotp: false,
};

/**
 * 测试用的维基条目, 通用登录类型, 网址, 备注与自定义字段都为空, 不带 TOTP.
 */
export const WIKI_ENTRY: EntryDetail = {
  id: "wiki",
  name: "维基",
  type: "login",
  account: "wiki-account",
  fields: { account: "wiki-account", password: "wiki-password", url: "" },
  notes: "",
  notesFormat: "plain",
  customFields: [],
  hasTotp: false,
};

/**
 * 测试用的钱包条目, 通用登录类型, 带网址, 多行备注, 一个普通与一个隐藏的多行自定义字段,
 * 以及一个值为空的自定义字段, 不带 TOTP.
 */
export const WALLET_ENTRY: EntryDetail = {
  id: "wallet",
  name: "钱包",
  type: "login",
  account: "wallet-account",
  fields: {
    account: "wallet-account",
    password: "wallet-password",
    url: "https://wallet.example.test/login",
  },
  notes: "备注第一行\n备注第二行",
  notesFormat: "plain",
  customFields: [
    {
      id: "wallet-pin",
      label: "取款码",
      value: "pin-1234",
      isHidden: false,
    },
    {
      id: "wallet-seed",
      label: "助记词",
      value: "seed-one seed-two\nseed-three seed-four",
      isHidden: true,
    },
    { id: "wallet-empty", label: "备用编号", value: "", isHidden: false },
  ],
  hasTotp: false,
};

/**
 * 测试用的带 TOTP 的邮箱条目, 通用登录类型, 带一个自定义字段与备注.
 */
export const MAIL_ENTRY: EntryDetail = {
  id: "mail",
  name: "邮箱",
  type: "login",
  account: "mail-account",
  fields: { account: "mail-account", password: "mail-password", url: "" },
  notes: "邮箱备注",
  notesFormat: "plain",
  customFields: [
    { id: "mail-pin", label: "备用码", value: "pin-0000", isHidden: false },
  ],
  hasTotp: true,
};

/**
 * 测试用的三个条目, 按最新创建在前排列.
 */
export const TEST_ENTRIES: readonly EntryDetail[] = [
  FORUM_ENTRY,
  BANK_ENTRY,
  WIKI_ENTRY,
];

/**
 * 类型的全部字段都有值的取值: 值里带类型键与字段键, 彼此不同, 多行字段的值有两行.
 * @param type 条目类型定义.
 * @returns 字段键到非空值的取值.
 */
export function sampleFieldValuesOf(
  type: PresetEntryTypeDefinition,
): Record<string, string> {
  return Object.fromEntries(
    type.fields.map((field) => {
      const value = `${type.key}-${field.key}`;
      return [field.key, field.isMultiline ? `${value}-1\n${value}-2` : value];
    }),
  );
}

/**
 * 某个类型的样例条目: 每个字段都有值, 备注为一行文字, 没有自定义字段, 不带 TOTP.
 * @param type 条目类型定义.
 * @returns 条目详情, 编号是 `sample-` 加类型键.
 */
export function sampleEntryOf(type: PresetEntryTypeDefinition): EntryDetail {
  const fields = sampleFieldValuesOf(type);
  return {
    id: `sample-${type.key}`,
    name: `样例 ${type.key}`,
    type: type.key,
    account: readAccount(fields),
    fields,
    notes: `${type.key}-notes`,
    notesFormat: "plain",
    customFields: [],
    hasTotp: false,
  };
}
