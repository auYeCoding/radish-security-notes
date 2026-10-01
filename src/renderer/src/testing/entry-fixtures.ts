import type { EntryDetail } from "@shared/entries/entry-types";

/**
 * 测试用的论坛条目.
 */
export const FORUM_ENTRY: EntryDetail = {
  id: "forum",
  name: "论坛",
  account: "forum-account",
  password: "forum-password",
};

/**
 * 测试用的银行条目.
 */
export const BANK_ENTRY: EntryDetail = {
  id: "bank",
  name: "银行",
  account: "bank-account",
  password: "bank-password",
};

/**
 * 测试用的维基条目.
 */
export const WIKI_ENTRY: EntryDetail = {
  id: "wiki",
  name: "维基",
  account: "wiki-account",
  password: "wiki-password",
};

/**
 * 测试用的三个条目, 按最新创建在前排列.
 */
export const TEST_ENTRIES: readonly EntryDetail[] = [
  FORUM_ENTRY,
  BANK_ENTRY,
  WIKI_ENTRY,
];
