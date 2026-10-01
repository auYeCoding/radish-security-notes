import type { EntryDetail } from "@shared/entries/entry-types";

/**
 * 测试用的论坛条目, 网址, 备注与自定义字段都为空.
 */
export const FORUM_ENTRY: EntryDetail = {
  id: "forum",
  name: "论坛",
  account: "forum-account",
  password: "forum-password",
  url: "",
  notes: "",
  customFields: [],
};

/**
 * 测试用的银行条目, 网址, 备注与自定义字段都为空.
 */
export const BANK_ENTRY: EntryDetail = {
  id: "bank",
  name: "银行",
  account: "bank-account",
  password: "bank-password",
  url: "",
  notes: "",
  customFields: [],
};

/**
 * 测试用的维基条目, 网址, 备注与自定义字段都为空.
 */
export const WIKI_ENTRY: EntryDetail = {
  id: "wiki",
  name: "维基",
  account: "wiki-account",
  password: "wiki-password",
  url: "",
  notes: "",
  customFields: [],
};

/**
 * 测试用的钱包条目, 带网址, 多行备注, 一个普通与一个隐藏的多行自定义字段, 以及一个值为空的
 * 自定义字段.
 */
export const WALLET_ENTRY: EntryDetail = {
  id: "wallet",
  name: "钱包",
  account: "wallet-account",
  password: "wallet-password",
  url: "https://wallet.example.test/login",
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
