import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../../testing/migrations-folder";
import { createMigrationsFolderUpTo } from "../../testing/partial-migrations-folder";
import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { entryAttachmentContents, entryAttachments } from "./attachment-schema";
import { entries } from "./entry-schema";
import { openVaultDatabase, type VaultDatabase } from "./open-vault-database";

/**
 * 迁移日志里附件迁移之前已有的迁移个数: 0000 至 0007.
 */
const BEFORE_ATTACHMENT_MIGRATION_COUNT = 8;

/**
 * 表结构信息里的一列.
 */
interface ColumnInfo {
  /**
   * 列名.
   */
  readonly name: string;
  /**
   * 是否不允许为空, 1 表示不允许.
   */
  readonly notnull: number;
}

/**
 * 索引列表里的一个索引.
 */
interface IndexInfo {
  /**
   * 索引名.
   */
  readonly name: string;
}

/**
 * 用项目的全部迁移打开数据库.
 * @param databaseFile 数据库文件路径.
 * @param dataKey 数据密钥.
 * @returns 迁移到最新结构的数据库.
 */
function openLatest(databaseFile: string, dataKey: Buffer): VaultDatabase {
  return openVaultDatabase({
    databaseFile,
    dataKey,
    migrationsFolder: MIGRATIONS_FOLDER,
  });
}

/**
 * 在数据库里写入一个最小的条目.
 * @param database 已迁移的数据库.
 * @param id 条目编号.
 */
function insertEntry(database: VaultDatabase, id: string): void {
  database.orm
    .insert(entries)
    .values({
      id,
      name: id,
      type: "login",
      fields: {},
      notes: "",
      customFields: [],
      totp: null,
      folderId: null,
      createdAt: 1,
    })
    .run();
}

/**
 * 给条目写入一个带内容的附件.
 * @param database 已迁移的数据库.
 * @param entryId 条目编号.
 * @param attachmentId 附件编号.
 * @param content 附件内容.
 */
function insertAttachment(
  database: VaultDatabase,
  entryId: string,
  attachmentId: string,
  content: Buffer,
): void {
  database.orm
    .insert(entryAttachments)
    .values({
      id: attachmentId,
      entryId,
      name: `${attachmentId}.bin`,
      size: content.length,
      position: 0,
    })
    .run();
  database.orm
    .insert(entryAttachmentContents)
    .values({ attachmentId, content })
    .run();
}

/**
 * 打开新库, 写入两个条目, 第一个条目带两个附件, 第二个条目带一个附件.
 * @param directory 临时目录.
 * @param name 数据库文件名.
 * @returns 写好数据的数据库.
 */
function openPopulated(directory: string, name: string): VaultDatabase {
  const database = openLatest(join(directory, name), randomBytes(32));
  insertEntry(database, "e-1");
  insertEntry(database, "e-2");
  insertAttachment(database, "e-1", "a-1", Buffer.from([1, 2, 3]));
  insertAttachment(database, "e-1", "a-2", Buffer.from([4, 5]));
  insertAttachment(database, "e-2", "a-3", Buffer.from([6]));
  return database;
}

/**
 * 附件元数据表与内容表里各自存着的附件编号.
 */
interface StoredAttachmentIds {
  /**
   * 元数据表里的附件编号, 按编号排序.
   */
  readonly metadata: readonly string[];
  /**
   * 内容表里的附件编号, 按编号排序.
   */
  readonly contents: readonly string[];
}

/**
 * 读出附件元数据与内容两张表里的附件编号.
 * @param database 已迁移的数据库.
 * @returns 两张表里各自的附件编号, 按编号排序.
 */
function listAttachmentIds(database: VaultDatabase): StoredAttachmentIds {
  const metadata = database.orm
    .select({ id: entryAttachments.id })
    .from(entryAttachments)
    .all()
    .map((row) => row.id)
    .sort();
  const contents = database.orm
    .select({ id: entryAttachmentContents.attachmentId })
    .from(entryAttachmentContents)
    .all()
    .map((row) => row.id)
    .sort();
  return { metadata, contents };
}

describe("附件迁移: 从 0007 升级的旧库", () => {
  const getDirectory = useTemporaryDirectory("attachment-migration-upgrade");

  it("旧条目升级后内容不变, 两张附件表是空的, 升级后可以写入附件并在重新打开后读回", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    const legacy = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: await createMigrationsFolderUpTo(
        getDirectory(),
        BEFORE_ATTACHMENT_MIGRATION_COUNT,
      ),
    });
    legacy.orm.run(
      sql`insert into entries (id, name, type, fields, notes, custom_fields, created_at) values ('old-1', '旧条目', 'login', '{}', '备注', '[]', 5)`,
    );
    legacy.close();

    const upgraded = openLatest(databaseFile, dataKey);
    const rows = upgraded.orm.select().from(entries).all();
    const before = listAttachmentIds(upgraded);
    insertAttachment(upgraded, "old-1", "a-1", Buffer.from([9, 8, 7]));
    upgraded.close();
    const reopened = openLatest(databaseFile, dataKey);
    const content = reopened.orm
      .select()
      .from(entryAttachmentContents)
      .where(eq(entryAttachmentContents.attachmentId, "a-1"))
      .get();
    reopened.close();

    expect(rows.map((row) => [row.id, row.name, row.notes])).toEqual([
      ["old-1", "旧条目", "备注"],
    ]);
    expect(before).toEqual({ metadata: [], contents: [] });
    expect([...(content?.content ?? [])]).toEqual([9, 8, 7]);
  });
});

describe("附件迁移: 全新建库的表结构", () => {
  const getDirectory = useTemporaryDirectory("attachment-migration-fresh");

  it("元数据表与内容表的列都不允许为空, 元数据表按条目编号建了索引", () => {
    const database = openLatest(
      join(getDirectory(), "vault.db"),
      randomBytes(32),
    );
    const metadataColumns = database.orm.all<ColumnInfo>(
      sql`select name, "notnull" from pragma_table_info('entry_attachments') order by name`,
    );
    const contentColumns = database.orm.all<ColumnInfo>(
      sql`select name, "notnull" from pragma_table_info('entry_attachment_contents') order by name`,
    );
    const indexes = database.orm.all<IndexInfo>(
      sql`select name from pragma_index_list('entry_attachments')`,
    );
    database.close();

    expect(metadataColumns).toEqual([
      { name: "entry_id", notnull: 1 },
      { name: "id", notnull: 1 },
      { name: "name", notnull: 1 },
      { name: "position", notnull: 1 },
      { name: "size", notnull: 1 },
    ]);
    expect(contentColumns).toEqual([
      { name: "attachment_id", notnull: 1 },
      { name: "content", notnull: 1 },
    ]);
    expect(indexes.map((index) => index.name)).toContain(
      "entry_attachments_entry_id_index",
    );
  });
});

describe("附件迁移: 级联删除", () => {
  const getDirectory = useTemporaryDirectory("attachment-migration-cascade");

  it("删除条目时它的附件元数据与内容都随之删除, 别的条目的附件不受影响", () => {
    const database = openPopulated(getDirectory(), "cascade-entry.db");

    database.orm.delete(entries).where(eq(entries.id, "e-1")).run();
    const remaining = listAttachmentIds(database);
    database.close();

    expect(remaining).toEqual({ metadata: ["a-3"], contents: ["a-3"] });
  });

  it("删除一个附件的元数据时它的内容随之删除, 别的附件不受影响", () => {
    const database = openPopulated(getDirectory(), "cascade-attachment.db");

    database.orm
      .delete(entryAttachments)
      .where(eq(entryAttachments.id, "a-1"))
      .run();
    const remaining = listAttachmentIds(database);
    database.close();

    expect(remaining).toEqual({
      metadata: ["a-2", "a-3"],
      contents: ["a-2", "a-3"],
    });
  });

  it("内容表不能挂在不存在的附件上", () => {
    const database = openPopulated(getDirectory(), "orphan-content.db");

    expect(() =>
      database.orm
        .insert(entryAttachmentContents)
        .values({ attachmentId: "missing", content: Buffer.from([1]) })
        .run(),
    ).toThrow();
    database.close();
  });
});
