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
 * 读出全部业务表的全部行并拼成一个文本, 测试用它断言一个操作前后库里的内容完全一致.
 * @param orm 已解锁数据库的查询入口.
 * @returns 全部业务表内容的文本快照.
 */
export function snapshotDatabase(orm: VaultOrm): string {
  return [
    stringifyRows(orm.select().from(entries).all()),
    stringifyRows(orm.select().from(folders).all()),
    stringifyRows(orm.select().from(tags).all()),
    stringifyRows(orm.select().from(entryTags).all()),
    stringifyRows(orm.select().from(customEntryTypes).all()),
    stringifyRows(orm.select().from(customEntryTypeFields).all()),
    stringifyRows(orm.select().from(entryAttachments).all()),
    stringifyRows(orm.select().from(entryAttachmentContents).all()),
  ].join("\n");
}
