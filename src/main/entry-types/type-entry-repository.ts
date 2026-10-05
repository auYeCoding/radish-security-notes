import { eq } from "drizzle-orm";

import type { EntryCustomField } from "@shared/entries/custom-field-types";
import type { EntryFieldValues } from "@shared/entries/entry-types";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";

/**
 * 一个类型下的条目里与类型修改有关的列.
 */
export interface TypeEntryRow {
  /**
   * 条目的唯一编号.
   */
  readonly id: string;
  /**
   * 条目表里保存的类型字段取值.
   */
  readonly fields: EntryFieldValues;
  /**
   * 条目原有的自定义字段.
   */
  readonly customFields: readonly EntryCustomField[];
}

/**
 * 条目改归另一个类型时要写入的列.
 */
export interface EntryRelocationPatch {
  /**
   * 改归后的类型键.
   */
  readonly type: string;
  /**
   * 改归后的类型字段取值.
   */
  readonly fields: EntryFieldValues;
  /**
   * 改归后的自定义字段.
   */
  readonly customFields: readonly EntryCustomField[];
}

/**
 * 读取某个类型下全部条目与类型修改有关的列, 不含名称, 备注与 TOTP.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param typeKey 类型键.
 * @returns 该类型下的条目行.
 */
export function listEntriesOfType(
  orm: VaultOrm,
  typeKey: string,
): TypeEntryRow[] {
  return orm
    .select({
      id: entries.id,
      fields: entries.fields,
      customFields: entries.customFields,
    })
    .from(entries)
    .where(eq(entries.type, typeKey))
    .all();
}

/**
 * 改写一个条目的类型字段取值.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param id 条目编号.
 * @param fields 改写后的类型字段取值.
 */
export function updateEntryFieldValues(
  orm: VaultOrm,
  id: string,
  fields: EntryFieldValues,
): void {
  orm.update(entries).set({ fields }).where(eq(entries.id, id)).run();
}

/**
 * 把一个条目改归另一个类型, 同时写入新的类型字段取值与自定义字段.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param id 条目编号.
 * @param patch 改归后的类型键, 类型字段取值与自定义字段.
 */
export function relocateEntry(
  orm: VaultOrm,
  id: string,
  patch: EntryRelocationPatch,
): void {
  orm
    .update(entries)
    .set({
      type: patch.type,
      fields: patch.fields,
      customFields: patch.customFields,
    })
    .where(eq(entries.id, id))
    .run();
}
