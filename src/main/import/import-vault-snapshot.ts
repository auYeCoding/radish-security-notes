import { listFolders } from "../folders/folder-repository";
import { listTags } from "../tags/tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";
import { duplicateKeyOf } from "./import-duplicate-key";

/**
 * 导入预览用到的库里现状: 已有条目的判重键, 已有文件夹与标签的名称.
 */
export interface VaultSnapshot {
  /**
   * 已有条目的判重键集合.
   */
  readonly entryKeys: ReadonlySet<string>;
  /**
   * 已有文件夹的名称.
   */
  readonly folderNames: readonly string[];
  /**
   * 已有标签的名称.
   */
  readonly tagNames: readonly string[];
}

/**
 * 读取库里的现状, 只读不写. 条目只取名称与类型字段来算判重键, 不读备注, 自定义字段与 TOTP.
 * @param orm 已解锁数据库的查询入口.
 * @returns 库里现状的快照.
 */
export function readVaultSnapshot(orm: VaultOrm): VaultSnapshot {
  const rows = orm
    .select({ name: entries.name, fields: entries.fields })
    .from(entries)
    .all();
  return {
    entryKeys: new Set(rows.map((row) => duplicateKeyOf(row.name, row.fields))),
    folderNames: listFolders(orm).map((folder) => folder.name),
    tagNames: listTags(orm).map((tag) => tag.name),
  };
}
