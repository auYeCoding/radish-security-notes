import {
  createEntryTypeCatalog,
  type EntryTypeCatalog,
} from "@shared/entries/custom-types/entry-type-catalog";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { listCustomEntryTypes } from "./custom-entry-type-reader";

/**
 * 读取数据库里的自定义类型, 与预设类型一起建成类型目录. 目录是读取那一刻的快照, 一次操作开始时
 * 建一个, 操作里一直用它.
 * @param orm 已解锁数据库的查询入口.
 * @returns 类型目录.
 */
export function loadEntryTypeCatalog(orm: VaultOrm): EntryTypeCatalog {
  return createEntryTypeCatalog(listCustomEntryTypes(orm));
}
