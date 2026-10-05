import { eq } from "drizzle-orm";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  customEntryTypeFields,
  customEntryTypes,
} from "../vault/database/custom-entry-type-schema";
import type { CustomEntryTypeRows } from "./custom-entry-type-repository";

/**
 * 用修改后的行替换一个自定义类型: 类型行改成新名称, 原有字段行全部删除后写入新的字段行. 调用方要把
 * 它放在事务里, 和已有条目的改写一起成功或一起失败.
 * @param orm 已解锁数据库的事务.
 * @param rows 修改后的类型行与字段行, 类型编号指明要替换的类型.
 */
export function replaceCustomEntryType(
  orm: VaultOrm,
  rows: CustomEntryTypeRows,
): void {
  orm
    .update(customEntryTypes)
    .set({ name: rows.type.name })
    .where(eq(customEntryTypes.id, rows.type.id))
    .run();
  orm
    .delete(customEntryTypeFields)
    .where(eq(customEntryTypeFields.typeId, rows.type.id))
    .run();
  orm
    .insert(customEntryTypeFields)
    .values([...rows.fields])
    .run();
}

/**
 * 删除一个自定义类型, 字段行随外键级联删除. 调用方要把它放在事务里, 并先处理好该类型下的条目.
 * @param orm 已解锁数据库的事务.
 * @param id 类型编号.
 */
export function deleteCustomEntryType(orm: VaultOrm, id: string): void {
  orm.delete(customEntryTypes).where(eq(customEntryTypes.id, id)).run();
}
