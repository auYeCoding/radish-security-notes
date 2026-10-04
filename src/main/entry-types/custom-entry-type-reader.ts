import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { toCustomEntryType } from "./custom-entry-type-mapper";
import { listCustomEntryTypeRows } from "./custom-entry-type-repository";

/**
 * 读取全部自定义类型, 先创建的在前, 字段按显示顺序排列.
 * @param orm 已解锁数据库的查询入口.
 * @returns 自定义类型列表.
 */
export function listCustomEntryTypes(orm: VaultOrm): CustomEntryType[] {
  return listCustomEntryTypeRows(orm).map(toCustomEntryType);
}
