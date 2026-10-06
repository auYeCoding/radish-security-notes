import {
  entryAttachmentContents,
  entryAttachments,
} from "../vault/database/attachment-schema";
import {
  customEntryTypeFields,
  customEntryTypes,
} from "../vault/database/custom-entry-type-schema";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";
import { folders } from "../vault/database/folder-schema";
import { entryTags, tags } from "../vault/database/tag-schema";

/**
 * 把一批行转成稳定的文本, 缓冲区转成十六进制, 便于比较.
 * @param rows 数据库里读出的行.
 * @returns 行的 JSON 文本.
 */
function stringifyRows(rows: readonly object[]): string {
  return JSON.stringify(rows, (_key, value: unknown) =>
    value instanceof Uint8Array ? Buffer.from(value).toString("hex") : value,
  );
}

/**
 * 快照的选项.
 */
export interface SnapshotOptions {
  /**
   * 是否忽略文件夹, 标签与自定义类型的创建时间. 这三张表的创建时间不在本应用完整格式里, 从备份
   * 恢复后统一是恢复时刻, 往返测试比较恢复前后的库时要忽略它, 其余内容与行的先后仍逐项比较.
   */
  readonly ignoreLabelCreatedAt?: boolean;
}

/**
 * 去掉一批行里的创建时间.
 * @param rows 数据库里读出的行.
 * @returns 没有创建时间的行.
 */
function withoutCreatedAt(rows: readonly object[]): object[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== "createdAt"),
    ),
  );
}

/**
 * 读出全部业务表的全部行并拼成一个文本, 测试用它断言一个操作前后库里的内容完全一致.
 * @param orm 已解锁数据库的查询入口.
 * @param options 快照的选项, 默认逐项包含全部列.
 * @returns 全部业务表内容的文本快照.
 */
export function snapshotDatabase(
  orm: VaultOrm,
  options: SnapshotOptions = {},
): string {
  const labelRows = (rows: readonly object[]): readonly object[] =>
    options.ignoreLabelCreatedAt === true ? withoutCreatedAt(rows) : rows;
  return [
    stringifyRows(orm.select().from(entries).all()),
    stringifyRows(labelRows(orm.select().from(folders).all())),
    stringifyRows(labelRows(orm.select().from(tags).all())),
    stringifyRows(orm.select().from(entryTags).all()),
    stringifyRows(labelRows(orm.select().from(customEntryTypes).all())),
    stringifyRows(orm.select().from(customEntryTypeFields).all()),
    stringifyRows(orm.select().from(entryAttachments).all()),
    stringifyRows(orm.select().from(entryAttachmentContents).all()),
  ].join("\n");
}
