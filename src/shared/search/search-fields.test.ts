import { describe, expect, it } from "vitest";

import { PRESET_ENTRY_TYPES } from "../entries/preset-entry-types";
import {
  SEARCHABLE_FIELD_KEYS,
  SEARCH_NAME_FIELD,
  SEARCH_NOTES_FIELD,
  SEARCH_TAG_FIELD,
  isPinyinSearchField,
  isSearchableFieldKey,
  searchableFieldKeysOf,
} from "./search-fields";

/**
 * 预设类型里全部被标为敏感的字段键, 搜索一律不读取它们.
 */
const SENSITIVE_KEYS = [
  "password",
  "privateKey",
  "apiKey",
  "networkPassword",
  "routerPassword",
  "recoveryPhrase",
  "walletPassword",
  "keyPassphrase",
  "licenseKey",
  "cardNumber",
  "securityCode",
  "cardPin",
  "documentNumber",
];

describe("参与搜索的字段键", () => {
  it("不含任何敏感字段键", () => {
    for (const key of SENSITIVE_KEYS) {
      expect(SEARCHABLE_FIELD_KEYS).not.toContain(key);
      expect(isSearchableFieldKey(key)).toBe(false);
    }
  });

  it("每个预设类型的每个字段不是参与搜索的, 就是敏感的, 没有第三类", () => {
    for (const type of PRESET_ENTRY_TYPES) {
      for (const field of type.fields) {
        const isSearchable = isSearchableFieldKey(field.key);
        expect(isSearchable).toBe(!field.isSensitive);
        expect(SENSITIVE_KEYS.includes(field.key)).toBe(field.isSensitive);
      }
    }
  });

  it("包含账号, 网址与其它非保密字段", () => {
    for (const key of [
      "account",
      "url",
      "downloadUrl",
      "email",
      "host",
      "cardholder",
      "content",
      "publicKey",
    ]) {
      expect(isSearchableFieldKey(key)).toBe(true);
    }
  });

  it("没有重复的键", () => {
    expect(new Set(SEARCHABLE_FIELD_KEYS).size).toBe(
      SEARCHABLE_FIELD_KEYS.length,
    );
  });

  it("不是字段键的字符串不算", () => {
    expect(isSearchableFieldKey("name")).toBe(false);
    expect(isSearchableFieldKey("")).toBe(false);
  });
});

describe("searchableFieldKeysOf", () => {
  it("登录类型只取账号与网址, 保持类型里的顺序", () => {
    const login = PRESET_ENTRY_TYPES.find((type) => type.key === "login");

    expect(login === undefined ? [] : searchableFieldKeysOf(login)).toEqual([
      "account",
      "url",
    ]);
  });

  it("银行卡类型不含卡号, 安全码与卡密码", () => {
    const card = PRESET_ENTRY_TYPES.find((type) => type.key === "bankCard");

    expect(card === undefined ? [] : searchableFieldKeysOf(card)).toEqual([
      "cardholder",
      "bankName",
      "expiry",
    ]);
  });
});

describe("isPinyinSearchField", () => {
  it("名称与标签名做拼音首字母匹配", () => {
    expect(isPinyinSearchField(SEARCH_NAME_FIELD)).toBe(true);
    expect(isPinyinSearchField(SEARCH_TAG_FIELD)).toBe(true);
  });

  it("备注, 账号等其它字段不做", () => {
    expect(isPinyinSearchField(SEARCH_NOTES_FIELD)).toBe(false);
    expect(isPinyinSearchField("account")).toBe(false);
  });
});
