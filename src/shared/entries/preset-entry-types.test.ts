import { describe, expect, it } from "vitest";

import en from "../locales/en.json";
import zh from "../locales/zh.json";
import {
  ACCOUNT_FIELD_KEY,
  ENTRY_ACCOUNT_MAX_LENGTH,
  ENTRY_PASSWORD_MAX_LENGTH,
} from "./common-entry-fields";
import type { EntryFieldDefinition } from "./entry-field-types";
import {
  findEntryType,
  isEntryFieldKey,
  isEntryTypeKey,
  LEGACY_ENTRY_TYPE_KEY,
  PRESET_ENTRY_TYPES,
  requireEntryType,
} from "./preset-entry-types";

/**
 * 用户确认的类型清单与字段: 键是类型键, 值是按顺序排列的字段键. 字段键后的 "●" 表示默认遮罩,
 * "¶" 表示多行输入.
 */
const CONFIRMED_TYPES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["login", ["account", "password●", "url"]],
  ["forum", ["account", "password●", "email", "url"]],
  [
    "database",
    [
      "databaseKind",
      "databaseHost",
      "port",
      "databaseName",
      "account",
      "password●",
    ],
  ],
  ["server", ["host", "port", "account", "password●", "url"]],
  [
    "bankCard",
    [
      "cardholder",
      "bankName",
      "cardNumber●",
      "expiry",
      "securityCode●",
      "cardPin●",
    ],
  ],
  [
    "cryptoWallet",
    [
      "walletAddress",
      "blockchainNetwork",
      "recoveryPhrase●¶",
      "walletPassword●",
      "privateKey●¶",
    ],
  ],
  ["apiKey", ["host", "account", "apiKey●"]],
  [
    "softwareLicense",
    [
      "version",
      "licenseKey●",
      "registeredName",
      "registeredEmail",
      "downloadUrl",
    ],
  ],
  ["secureNote", ["content¶"]],
  [
    "wifi",
    [
      "networkName",
      "networkPassword●",
      "securityKind",
      "routerAddress",
      "routerAccount",
      "routerPassword●",
    ],
  ],
  [
    "sshKey",
    ["host", "port", "account", "privateKey●¶", "publicKey¶", "keyPassphrase●"],
  ],
  ["identity", ["fullName", "email", "phone", "documentNumber●", "address¶"]],
];

/**
 * 带长度上限的字段键与上限, 其余字段不设上限.
 */
const EXPECTED_MAX_LENGTHS: Readonly<Record<string, number>> = {
  account: ENTRY_ACCOUNT_MAX_LENGTH,
  password: ENTRY_PASSWORD_MAX_LENGTH,
};

/**
 * 把字段定义写成确认清单里的形式: 字段键加遮罩与多行标记.
 * @param field 字段定义.
 * @returns 字段键后接 "●" 与 "¶" 标记的文本.
 */
function describeField(field: EntryFieldDefinition): string {
  const sensitiveMark = field.isSensitive ? "●" : "";
  const multilineMark = field.isMultiline ? "¶" : "";
  return `${field.key}${sensitiveMark}${multilineMark}`;
}

describe("预设条目类型与用户确认的清单一致", () => {
  it("共 12 个类型, 顺序与类型键和确认清单一致", () => {
    expect(PRESET_ENTRY_TYPES.map((type) => type.key)).toEqual(
      CONFIRMED_TYPES.map(([key]) => key),
    );
  });

  it.each(CONFIRMED_TYPES)(
    "%s 的字段, 顺序与遮罩, 多行设定一致",
    (key, fields) => {
      const type = PRESET_ENTRY_TYPES.find(
        (candidate) => candidate.key === key,
      );

      expect(type?.fields.map(describeField)).toEqual(fields);
    },
  );
});

describe("预设条目类型的结构约束", () => {
  it("同一类型里字段键唯一, 且没有字段占用备注的字段名", () => {
    for (const type of PRESET_ENTRY_TYPES) {
      const keys = type.fields.map((field) => field.key);

      expect(new Set(keys).size).toBe(keys.length);
      expect(keys).not.toContain("notes");
    }
  });

  it("每个类型至多一个账号字段, 账号与密码带长度上限, 其余字段不设上限", () => {
    for (const type of PRESET_ENTRY_TYPES) {
      const accountFields = type.fields.filter(
        (field) => field.key === ACCOUNT_FIELD_KEY,
      );
      expect(accountFields.length).toBeLessThanOrEqual(1);
      for (const field of type.fields) {
        expect(field.maxLength).toBe(EXPECTED_MAX_LENGTHS[field.key]);
      }
    }
  });
});

describe("预设条目类型的文案", () => {
  it("每个类型名与字段名在中文与英文里都有文案", () => {
    for (const type of PRESET_ENTRY_TYPES) {
      expect(zh.entryTypes[type.key]).not.toBe("");
      expect(en.entryTypes[type.key]).not.toBe("");
      for (const field of type.fields) {
        expect(zh.entryFields[field.key]).not.toBe("");
        expect(en.entryFields[field.key]).not.toBe("");
      }
    }
  });
});

describe("预设条目类型的查找", () => {
  it("旧条目归入通用登录", () => {
    expect(LEGACY_ENTRY_TYPE_KEY).toBe("login");
  });

  it("认得预设类型键, 不认得其它值", () => {
    expect(isEntryTypeKey("bankCard")).toBe(true);
    expect(isEntryTypeKey("custom")).toBe(false);
    expect(isEntryTypeKey(1)).toBe(false);
    expect(isEntryTypeKey(undefined)).toBe(false);
  });

  it("认得预设字段键, 不认得其它值, 自定义字段键也不是预设字段键", () => {
    expect(isEntryFieldKey("cardNumber")).toBe(true);
    expect(isEntryFieldKey("account")).toBe(true);
    expect(isEntryFieldKey("field-abc")).toBe(false);
    expect(isEntryFieldKey(1)).toBe(false);
    expect(isEntryFieldKey(undefined)).toBe(false);
  });

  it("按类型键找类型, 未知类型键时 find 返回 undefined, require 抛错", () => {
    expect(findEntryType("sshKey")?.key).toBe("sshKey");
    expect(findEntryType("custom")).toBeUndefined();
    expect(requireEntryType("wifi").key).toBe("wifi");
    expect(() => requireEntryType("custom")).toThrow("未知的条目类型");
  });
});
