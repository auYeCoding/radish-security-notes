import type { EntryTypeDefinition } from "./entry-field-types";
import { API_KEY_TYPE } from "./preset-types/api-key-type";
import { BANK_CARD_TYPE } from "./preset-types/bank-card-type";
import { CRYPTO_WALLET_TYPE } from "./preset-types/crypto-wallet-type";
import { DATABASE_TYPE } from "./preset-types/database-type";
import { FORUM_TYPE } from "./preset-types/forum-type";
import { IDENTITY_TYPE } from "./preset-types/identity-type";
import { LOGIN_TYPE } from "./preset-types/login-type";
import { SECURE_NOTE_TYPE } from "./preset-types/secure-note-type";
import { SERVER_TYPE } from "./preset-types/server-type";
import { SOFTWARE_LICENSE_TYPE } from "./preset-types/software-license-type";
import { SSH_KEY_TYPE } from "./preset-types/ssh-key-type";
import { WIFI_TYPE } from "./preset-types/wifi-type";

/**
 * 全部预设条目类型, 顺序就是新建时类型网格里的顺序.
 */
export const PRESET_ENTRY_TYPES = [
  LOGIN_TYPE,
  FORUM_TYPE,
  DATABASE_TYPE,
  SERVER_TYPE,
  BANK_CARD_TYPE,
  CRYPTO_WALLET_TYPE,
  API_KEY_TYPE,
  SOFTWARE_LICENSE_TYPE,
  SECURE_NOTE_TYPE,
  WIFI_TYPE,
  SSH_KEY_TYPE,
  IDENTITY_TYPE,
] as const;

/**
 * 预设条目类型的类型键.
 */
export type EntryTypeKey = (typeof PRESET_ENTRY_TYPES)[number]["key"];

/**
 * 全部预设条目类型里出现过的字段键.
 */
export type EntryFieldKey =
  (typeof PRESET_ENTRY_TYPES)[number]["fields"][number]["key"];

/**
 * 预设条目类型的定义, 类型键与字段键都是预设里出现过的.
 */
export type PresetEntryTypeDefinition = EntryTypeDefinition<
  EntryTypeKey,
  EntryFieldKey
>;

/**
 * 旧条目升级后归入的类型键. 迁移 0003 的 SQL 写死了同一个值.
 */
export const LEGACY_ENTRY_TYPE_KEY: EntryTypeKey = LOGIN_TYPE.key;

/**
 * 判断一个值是否是预设条目类型的类型键.
 * @param value 待判断的值.
 * @returns 是类型键时返回 true.
 */
export function isEntryTypeKey(value: unknown): value is EntryTypeKey {
  return PRESET_ENTRY_TYPES.some((type) => type.key === value);
}

/**
 * 全部预设条目类型里出现过的字段键的集合.
 */
const PRESET_FIELD_KEYS: ReadonlySet<string> = new Set(
  PRESET_ENTRY_TYPES.flatMap((type) => type.fields.map((field) => field.key)),
);

/**
 * 判断一个值是否是预设条目类型里出现过的字段键.
 * @param value 待判断的值.
 * @returns 是预设字段键时返回 true.
 */
export function isEntryFieldKey(value: unknown): value is EntryFieldKey {
  return typeof value === "string" && PRESET_FIELD_KEYS.has(value);
}

/**
 * 按类型键找预设条目类型.
 * @param key 类型键.
 * @returns 类型定义, 不是预设类型键时为 undefined.
 */
export function findEntryType(
  key: string,
): PresetEntryTypeDefinition | undefined {
  return PRESET_ENTRY_TYPES.find((type) => type.key === key);
}

/**
 * 按类型键取预设条目类型.
 * @param key 类型键.
 * @returns 类型定义.
 * @throws Error 当不是预设类型键时.
 */
export function requireEntryType(key: string): PresetEntryTypeDefinition {
  const type = findEntryType(key);
  if (type === undefined) {
    throw new Error(`未知的条目类型: ${key}`);
  }
  return type;
}
