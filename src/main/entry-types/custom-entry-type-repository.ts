import { asc, sql } from "drizzle-orm";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  customEntryTypeFields,
  customEntryTypes,
} from "../vault/database/custom-entry-type-schema";

/**
 * 自定义类型表里的一行.
 */
export type CustomEntryTypeRecord = typeof customEntryTypes.$inferSelect;

/**
 * 自定义类型字段表里的一行.
 */
export type CustomEntryTypeFieldRecord =
  typeof customEntryTypeFields.$inferSelect;

/**
 * 一个自定义类型在数据库里的全部行: 类型行与它的字段行.
 */
export interface CustomEntryTypeRows {
  /**
   * 类型行.
   */
  readonly type: CustomEntryTypeRecord;
  /**
   * 字段行, 按位置排列.
   */
  readonly fields: readonly CustomEntryTypeFieldRecord[];
}

/**
 * 在同一个事务里插入一个自定义类型: 类型行与全部字段行要么都写入, 要么都不写入.
 * @param orm 已解锁数据库的查询入口.
 * @param rows 要插入的类型行与字段行.
 */
export function insertCustomEntryType(
  orm: VaultOrm,
  rows: CustomEntryTypeRows,
): void {
  orm.transaction((transaction) => {
    transaction.insert(customEntryTypes).values(rows.type).run();
    transaction
      .insert(customEntryTypeFields)
      .values([...rows.fields])
      .run();
  });
}

/**
 * 读取全部自定义类型的行, 先创建的在前, 创建时间相同时先插入的在前, 字段按位置排列.
 * @param orm 已解锁数据库的查询入口.
 * @returns 每个类型的类型行与字段行.
 */
export function listCustomEntryTypeRows(orm: VaultOrm): CustomEntryTypeRows[] {
  const types = orm
    .select()
    .from(customEntryTypes)
    .orderBy(asc(customEntryTypes.createdAt), sql`rowid asc`)
    .all();
  const fields = orm
    .select()
    .from(customEntryTypeFields)
    .orderBy(asc(customEntryTypeFields.position))
    .all();
  return types.map((type) => ({
    type,
    fields: fields.filter((field) => field.typeId === type.id),
  }));
}
