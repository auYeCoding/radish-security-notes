import { DEFAULT_TAG_COLOR } from "@shared/tags/tag-colors";

import type { EntryRecord } from "../entries/entry-repository";
import { insertFolder } from "../folders/folder-repository";
import { insertTag } from "../tags/tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 搜索测试里放进保密位置的值, 它们不得出现在搜索读出的行, 命中结果与日志里. 值都是小写, 因为搜索
 * 比对前会把文本转成小写.
 */
export const SECRET_CANARIES = {
  password: "canary-password",
  hiddenCustomValue: "canary-hidden-value",
  visibleCustomValue: "canary-visible-value",
  totpSecret: "canarytotpsecret",
  folderName: "canary-folder-name",
} as const;

/**
 * 构造一个测试用的条目行: 通用登录类型, 账号, 网址, 备注, 两个自定义字段 (一个隐藏), TOTP 与
 * 放在保密位置的标记值都有.
 * @param id 条目编号.
 * @param overrides 要覆盖的列.
 * @returns 条目行.
 */
export function searchRecordOf(
  id: string,
  overrides: Partial<EntryRecord> = {},
): EntryRecord {
  return {
    id,
    name: `name-${id}`,
    type: "login",
    fields: {
      account: `account-${id}`,
      password: SECRET_CANARIES.password,
      url: `https://${id}.example.test`,
    },
    notes: `notes-${id}`,
    notesFormat: "plain",
    customFields: [
      {
        id: `${id}-field-1`,
        label: `label-${id}`,
        value: SECRET_CANARIES.visibleCustomValue,
        isHidden: false,
      },
      {
        id: `${id}-field-2`,
        label: `hidden-label-${id}`,
        value: SECRET_CANARIES.hiddenCustomValue,
        isHidden: true,
      },
    ],
    totp: {
      secret: SECRET_CANARIES.totpSecret.toUpperCase(),
      algorithm: "SHA1",
      digits: 6,
      periodSeconds: 30,
    },
    folderId: null,
    createdAt: 1000,
    ...overrides,
  };
}

/**
 * 写入一个文件夹.
 * @param orm 已解锁数据库的查询入口.
 * @param id 文件夹编号.
 * @param name 文件夹名称.
 */
export function insertFolderNamed(
  orm: VaultOrm,
  id: string,
  name: string,
): void {
  insertFolder(orm, { id, name, createdAt: 1000 });
}

/**
 * 写入一个标签.
 * @param orm 已解锁数据库的查询入口.
 * @param id 标签编号.
 * @param name 标签名称.
 */
export function insertTagNamed(orm: VaultOrm, id: string, name: string): void {
  insertTag(orm, { id, name, color: DEFAULT_TAG_COLOR, createdAt: 1000 });
}
