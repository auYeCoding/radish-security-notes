import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../../testing/migrations-folder";
import { decryptDatabasePages } from "../../testing/decrypt-database-pages";
import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { entryAttachmentContents, entryAttachments } from "./attachment-schema";
import { entries } from "./entry-schema";
import { openVaultDatabase, type VaultDatabase } from "./open-vault-database";

/**
 * 被删附件内容里反复出现的标记文本前缀, 后面接一段随机十六进制.
 */
const DELETED_MARKER_PREFIX = "deleted-attachment-marker-";

/**
 * 保留附件内容里反复出现的标记文本前缀, 后面接一段随机十六进制.
 */
const KEPT_MARKER_PREFIX = "kept-attachment-marker-";

/**
 * 标记文本重复的次数, 让附件内容跨过多个数据库页, 覆盖溢出页的清除.
 */
const MARKER_REPEAT_COUNT = 800;

/**
 * 随机十六进制文本的字节数.
 */
const MARKER_RANDOM_BYTES = 16;

/**
 * 生成一个带随机后缀的标记文本.
 * @param prefix 标记前缀.
 * @returns 标记文本.
 */
function createMarker(prefix: string): string {
  return `${prefix}${randomBytes(MARKER_RANDOM_BYTES).toString("hex")}`;
}

/**
 * 在数据库里写入一个条目与它的附件, 附件内容是标记文本的多次重复.
 * @param database 已迁移的数据库.
 * @param entryId 条目编号.
 * @param marker 附件内容里的标记文本.
 */
function insertEntryWithAttachment(
  database: VaultDatabase,
  entryId: string,
  marker: string,
): void {
  database.orm
    .insert(entries)
    .values({ id: entryId, name: entryId, createdAt: 1 })
    .run();
  const content = Buffer.from(marker.repeat(MARKER_REPEAT_COUNT));
  database.orm
    .insert(entryAttachments)
    .values({
      id: `att-${entryId}`,
      entryId,
      name: `${marker}.bin`,
      size: content.length,
      position: 0,
    })
    .run();
  database.orm
    .insert(entryAttachmentContents)
    .values({ attachmentId: `att-${entryId}`, content })
    .run();
}

describe("附件内容的删除残留", () => {
  const getDirectory = useTemporaryDirectory("attachment-secure-delete");

  it("删除条目后, 被删附件的内容与文件名不残留在数据库页里, 保留附件的仍在", () => {
    const dataKey = randomBytes(32);
    const databaseFile = join(getDirectory(), "vault.db");
    const database = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const deleted = createMarker(DELETED_MARKER_PREFIX);
    const kept = createMarker(KEPT_MARKER_PREFIX);
    insertEntryWithAttachment(database, "deleted-entry", deleted);
    insertEntryWithAttachment(database, "kept-entry", kept);

    database.orm.delete(entries).where(eq(entries.id, "deleted-entry")).run();
    database.close();
    const pages = decryptDatabasePages(databaseFile, dataKey);

    expect(pages.includes(kept)).toBe(true);
    expect(pages.includes(deleted)).toBe(false);
  });

  it("单独删除一个附件后, 它的内容不残留在数据库页里", () => {
    const dataKey = randomBytes(32);
    const databaseFile = join(getDirectory(), "vault-single.db");
    const database = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const deleted = createMarker(DELETED_MARKER_PREFIX);
    insertEntryWithAttachment(database, "entry", deleted);

    database.orm
      .delete(entryAttachments)
      .where(eq(entryAttachments.id, "att-entry"))
      .run();
    database.close();
    const pages = decryptDatabasePages(databaseFile, dataKey);

    expect(pages.includes(deleted)).toBe(false);
  });
});
