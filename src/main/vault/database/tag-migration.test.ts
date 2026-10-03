import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { eq, sql, type SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../../testing/migrations-folder";
import { createMigrationsFolderUpTo } from "../../testing/partial-migrations-folder";
import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { entries } from "./entry-schema";
import { folders } from "./folder-schema";
import { openVaultDatabase, type VaultDatabase } from "./open-vault-database";
import { entryTags, tags } from "./tag-schema";

/**
 * 迁移日志里标签迁移之前已有的迁移个数: 0000 至 0006.
 */
const BEFORE_TAG_MIGRATION_COUNT = 7;

/**
 * 标签迁移之前的库里放在文件夹里, 带 TOTP 与多行备注的一行.
 */
const FOLDERED_ROW = sql`insert into entries (id, name, type, fields, notes, custom_fields, totp, folder_id, created_at) values ('old-1', '旧论坛', 'forum', '{"account":"a","password":"p","email":"","url":""}', '备注第一行
备注第二行', '[{"id":"f-1","label":"助记词","value":"a b","isHidden":true}]', '{"secret":"JBSWY3DPEHPK3PXP","algorithm":"SHA1","digits":6,"periodSeconds":30}', 'folder-1', 5)`;

/**
 * 标签迁移之前的库里未分类, 只有名称的一行.
 */
const BARE_ROW = sql`insert into entries (id, name, type, fields, notes, custom_fields, created_at) values ('old-2', '只有名称', 'login', '{}', '', '[]', 6)`;

/**
 * 标签迁移之前的库里的一个文件夹.
 */
const FOLDER_ROW = sql`insert into folders (id, name, created_at) values ('folder-1', '工作', 4)`;

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
 * 外键开关的查询结果.
 */
interface ForeignKeysPragma {
  /**
   * 外键是否开启, 1 表示开启.
   */
  readonly enabled: number;
}

/**
 * 在临时目录里造一个标签迁移之前的旧库: 只应用 0000 至 0006, 写入给定的行后关闭.
 * @param directory 临时目录.
 * @param databaseFile 数据库文件路径.
 * @param dataKey 数据密钥.
 * @param rows 要写入的插入语句.
 * @returns 写入完成后兑现.
 */
async function createLegacyDatabase(
  directory: string,
  databaseFile: string,
  dataKey: Buffer,
  rows: readonly SQL[],
): Promise<void> {
  const legacy = openVaultDatabase({
    databaseFile,
    dataKey,
    migrationsFolder: await createMigrationsFolderUpTo(
      directory,
      BEFORE_TAG_MIGRATION_COUNT,
    ),
  });
  rows.forEach((row) => legacy.orm.run(row));
  legacy.close();
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

describe("标签迁移: 从 0006 升级的旧库的条目", () => {
  const getDirectory = useTemporaryDirectory("tag-migration-upgrade");

  it("旧条目升级后内容与所属文件夹不变, 标签表与关联表是空的", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    await createLegacyDatabase(getDirectory(), databaseFile, dataKey, [
      FOLDER_ROW,
      FOLDERED_ROW,
      BARE_ROW,
    ]);

    const upgraded = openLatest(databaseFile, dataKey);
    const rows = upgraded.orm.select().from(entries).all();
    const folderRows = upgraded.orm.select().from(folders).all();
    const tagRows = upgraded.orm.select().from(tags).all();
    const linkRows = upgraded.orm.select().from(entryTags).all();
    upgraded.close();

    expect(rows.map((row) => [row.id, row.name, row.folderId])).toEqual([
      ["old-1", "旧论坛", "folder-1"],
      ["old-2", "只有名称", null],
    ]);
    expect(rows[0]?.notes).toBe("备注第一行\n备注第二行");
    expect(rows[0]?.totp?.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(folderRows).toEqual([
      { id: "folder-1", name: "工作", createdAt: 4 },
    ]);
    expect(tagRows).toEqual([]);
    expect(linkRows).toEqual([]);
  });
});

describe("标签迁移: 从 0006 升级的旧库的标签", () => {
  const getDirectory = useTemporaryDirectory("tag-migration-reopen");

  it("升级后可以新建标签并给旧条目打上, 再次打开仍在", async () => {
    const databaseFile = join(getDirectory(), "vault-reopen.db");
    const dataKey = randomBytes(32);
    await createLegacyDatabase(getDirectory(), databaseFile, dataKey, [
      BARE_ROW,
    ]);
    const upgraded = openLatest(databaseFile, dataKey);
    upgraded.orm
      .insert(tags)
      .values({ id: "tag-1", name: "重要", color: "red", createdAt: 7 })
      .run();
    upgraded.orm
      .insert(entryTags)
      .values({ entryId: "old-2", tagId: "tag-1", position: 0 })
      .run();
    upgraded.close();

    const reopened = openLatest(databaseFile, dataKey);
    const tagRows = reopened.orm.select().from(tags).all();
    const linkRows = reopened.orm.select().from(entryTags).all();
    reopened.close();

    expect(tagRows).toEqual([
      { id: "tag-1", name: "重要", color: "red", createdAt: 7 },
    ]);
    expect(linkRows).toEqual([
      { entryId: "old-2", tagId: "tag-1", position: 0 },
    ]);
  });
});

describe("标签迁移: 全新建库的表结构", () => {
  const getDirectory = useTemporaryDirectory("tag-migration-fresh");

  it("有标签表与关联表, 列都不允许为空, 没有数据时都是空的", () => {
    const database = openLatest(
      join(getDirectory(), "vault.db"),
      randomBytes(32),
    );
    const tagColumns = database.orm.all<ColumnInfo>(
      sql`select name, "notnull" from pragma_table_info('tags') order by name`,
    );
    const linkColumns = database.orm.all<ColumnInfo>(
      sql`select name, "notnull" from pragma_table_info('entry_tags') order by name`,
    );
    const tagRows = database.orm.select().from(tags).all();
    const linkRows = database.orm.select().from(entryTags).all();
    database.close();

    expect(tagColumns).toEqual([
      { name: "color", notnull: 1 },
      { name: "created_at", notnull: 1 },
      { name: "id", notnull: 1 },
      { name: "name", notnull: 1 },
    ]);
    expect(linkColumns).toEqual([
      { name: "entry_id", notnull: 1 },
      { name: "position", notnull: 1 },
      { name: "tag_id", notnull: 1 },
    ]);
    expect(tagRows).toEqual([]);
    expect(linkRows).toEqual([]);
  });

  it("外键默认开启", () => {
    const database = openLatest(
      join(getDirectory(), "vault-foreign-keys.db"),
      randomBytes(32),
    );
    const [pragma] = database.orm.all<ForeignKeysPragma>(
      sql`select foreign_keys as enabled from pragma_foreign_keys`,
    );
    database.close();

    expect(pragma?.enabled).toBe(1);
  });
});

/**
 * 打开新库, 写入两个条目与两个标签, 并让第一个条目带两个标签, 第二个条目带第一个标签.
 * @param directory 临时目录.
 * @param name 数据库文件名.
 * @returns 写好数据的数据库.
 */
function openPopulated(directory: string, name: string): VaultDatabase {
  const database = openLatest(join(directory, name), randomBytes(32));
  insertEntry(database, "e-1");
  insertEntry(database, "e-2");
  database.orm
    .insert(tags)
    .values([
      { id: "t-1", name: "甲", color: "slate", createdAt: 1 },
      { id: "t-2", name: "乙", color: "blue", createdAt: 2 },
    ])
    .run();
  database.orm
    .insert(entryTags)
    .values([
      { entryId: "e-1", tagId: "t-1", position: 0 },
      { entryId: "e-1", tagId: "t-2", position: 1 },
      { entryId: "e-2", tagId: "t-1", position: 0 },
    ])
    .run();
  return database;
}

describe("标签迁移: 级联删除", () => {
  const getDirectory = useTemporaryDirectory("tag-migration-cascade");

  it("删除条目时它的关联随之删除, 标签与别的条目的关联不受影响", () => {
    const database = openPopulated(getDirectory(), "cascade-entry.db");

    database.orm.delete(entries).where(eq(entries.id, "e-1")).run();
    const linkRows = database.orm.select().from(entryTags).all();
    const tagRows = database.orm.select().from(tags).all();
    database.close();

    expect(linkRows).toEqual([{ entryId: "e-2", tagId: "t-1", position: 0 }]);
    expect(tagRows).toHaveLength(2);
  });

  it("删除标签时它的关联随之删除, 条目与别的标签的关联不受影响", () => {
    const database = openPopulated(getDirectory(), "cascade-tag.db");

    database.orm.delete(tags).where(eq(tags.id, "t-1")).run();
    const linkRows = database.orm.select().from(entryTags).all();
    const entryRows = database.orm.select().from(entries).all();
    database.close();

    expect(linkRows).toEqual([{ entryId: "e-1", tagId: "t-2", position: 1 }]);
    expect(entryRows).toHaveLength(2);
  });

  it("关联指向不存在的条目或标签时写入被拒绝", () => {
    const database = openPopulated(getDirectory(), "cascade-orphan.db");

    expect(() =>
      database.orm
        .insert(entryTags)
        .values({ entryId: "missing", tagId: "t-1", position: 0 })
        .run(),
    ).toThrow();
    expect(() =>
      database.orm
        .insert(entryTags)
        .values({ entryId: "e-2", tagId: "missing", position: 0 })
        .run(),
    ).toThrow();
    database.close();
  });
});
