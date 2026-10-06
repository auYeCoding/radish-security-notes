import { sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

import type { RestoreVaultState } from "@shared/restore/restore-types";

import { entryAttachments } from "../vault/database/attachment-schema";
import { customEntryTypes } from "../vault/database/custom-entry-type-schema";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";
import { folders } from "../vault/database/folder-schema";
import { tags } from "../vault/database/tag-schema";

/**
 * 数一张表里的行数.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param table 要数的表.
 * @returns 行数.
 */
function countRows(orm: VaultOrm, table: SQLiteTable): number {
  const row = orm
    .select({ value: sql<number>`count(*)` })
    .from(table)
    .get();
  return row?.value ?? 0;
}

/**
 * 读出保险库里现有内容的个数, 只读不写. 没有条目, 文件夹, 标签与自定义类型才算空保险库.
 * @param orm 已解锁数据库的查询入口或事务.
 * @returns 现有内容的个数与是否为空.
 */
export function readVaultState(orm: VaultOrm): RestoreVaultState {
  const entryCount = countRows(orm, entries);
  const folderCount = countRows(orm, folders);
  const tagCount = countRows(orm, tags);
  const customTypeCount = countRows(orm, customEntryTypes);
  return {
    isEmpty: entryCount + folderCount + tagCount + customTypeCount === 0,
    entryCount,
    attachmentCount: countRows(orm, entryAttachments),
    folderCount,
    tagCount,
    customTypeCount,
  };
}
