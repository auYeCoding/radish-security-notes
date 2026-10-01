import { readAccount, type EntryDetail } from "@shared/entries/entry-types";
import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

/**
 * 测试用的论坛条目, 通用登录类型, 网址, 备注与自定义字段都为空.
 */
export const FORUM_ENTRY: EntryDetail = {
  id: "forum",
  name: "论坛",
  type: "login",
  account: "forum-account",
  fields: { account: "forum-account", password: "forum-password", url: "" },
  notes: "",
  customFields: [],
};

/**
 * 测试用的银行条目, 通用登录类型, 网址, 备注与自定义字段都为空.
 */
export const BANK_ENTRY: EntryDetail = {
  id: "bank",
  name: "银行",
  type: "login",
  account: "bank-account",
  fields: { account: "bank-account", password: "bank-password", url: "" },
  notes: "",
  customFields: [],
};

/**
 * 测试用的维基条目, 通用登录类型, 网址, 备注与自定义字段都为空.
 */
export const WIKI_ENTRY: EntryDetail = {
  id: "wiki",
  name: "维基",
  type: "login",
  account: "wiki-account",
  fields: { account: "wiki-account", password: "wiki-password", url: "" },
  notes: "",
  customFields: [],
};

/**
 * 测试用的钱包条目, 通用登录类型, 带网址, 多行备注, 一个普通与一个隐藏的多行自定义字段,
 * 以及一个值为空的自定义字段.
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
 * 某个类型的样例条目: 每个字段都有值, 备注为一行文字, 没有自定义字段.
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
    customFields: [],
  };
}
