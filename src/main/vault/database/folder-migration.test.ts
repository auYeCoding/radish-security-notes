import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { sql, type SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../../testing/migrations-folder";
import { createMigrationsFolderUpTo } from "../../testing/partial-migrations-folder";
import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { entries } from "./entry-schema";
import { folders } from "./folder-schema";
import { openVaultDatabase, type VaultDatabase } from "./open-vault-database";

/**
 * 迁移日志里文件夹迁移之前已有的迁移个数: 0000 至 0005.
 */
const BEFORE_FOLDER_MIGRATION_COUNT = 6;

/**
 * 文件夹迁移之前的库里带 TOTP 与多行备注的一行.
 */
const RICH_ROW = sql`insert into entries (id, name, type, fields, notes, custom_fields, totp, created_at) values ('old-1', '旧论坛', 'forum', '{"account":"a","password":"p","email":"","url":""}', '备注第一行
备注第二行', '[{"id":"f-1","label":"助记词","value":"a b","isHidden":true}]', '{"secret":"JBSWY3DPEHPK3PXP","algorithm":"SHA1","digits":6,"periodSeconds":30}', 5)`;

/**
 * 文件夹迁移之前的库里只有名称的一行.
 */
const BARE_ROW = sql`insert into entries (id, name, type, fields, notes, custom_fields, created_at) values ('old-2', '只有名称', 'login', '{}', '', '[]', 6)`;

/**
 * 旧库升级后读出的两行: 内容不变, 所属文件夹为空, 即都在未分类.
 */
const UPGRADED_ROWS = [
  {
    id: "old-1",
    name: "旧论坛",
    type: "forum",
    fields: { account: "a", password: "p", email: "", url: "" },
    notes: "备注第一行\n备注第二行",
    notesFormat: "plain",
    customFields: [
      { id: "f-1", label: "助记词", value: "a b", isHidden: true },
    ],
    totp: {
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA1",
      digits: 6,
      periodSeconds: 30,
    },
    folderId: null,
    createdAt: 5,
  },
  {
    id: "old-2",
    name: "只有名称",
    type: "login",
    fields: {},
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: null,
    folderId: null,
    createdAt: 6,
  },
];

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
 * 在临时目录里造一个文件夹迁移之前的旧库: 只应用 0000 至 0005, 写入给定的行后关闭.
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
      BEFORE_FOLDER_MIGRATION_COUNT,
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

describe("文件夹迁移: 从 0005 升级的旧库的条目", () => {
  const getDirectory = useTemporaryDirectory("folder-migration-upgrade");

  it("旧条目升级后内容不变, 都归到未分类, 文件夹表是空的", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    await createLegacyDatabase(getDirectory(), databaseFile, dataKey, [
      RICH_ROW,
      BARE_ROW,
    ]);

    const upgraded = openLatest(databaseFile, dataKey);
    const rows = upgraded.orm.select().from(entries).all();
    const folderRows = upgraded.orm.select().from(folders).all();
    upgraded.close();

    expect(rows).toEqual(UPGRADED_ROWS);
    expect(folderRows).toEqual([]);
  });
});

describe("文件夹迁移: 从 0005 升级的旧库的文件夹", () => {
  const getDirectory = useTemporaryDirectory("folder-migration-use");

  it("升级后可以新建文件夹并把旧条目放进去, 再次打开仍在", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    await createLegacyDatabase(getDirectory(), databaseFile, dataKey, [
      BARE_ROW,
    ]);
    const upgraded = openLatest(databaseFile, dataKey);
    upgraded.orm
      .insert(folders)
      .values({ id: "folder-1", name: "工作", createdAt: 7 })
      .run();
    upgraded.orm.run(
      sql`update entries set folder_id = 'folder-1' where id = 'old-2'`,
    );
    upgraded.close();

    const reopened = openLatest(databaseFile, dataKey);
    const rows = reopened.orm.select().from(entries).all();
    const folderRows = reopened.orm.select().from(folders).all();
    reopened.close();

    expect(rows[0]?.folderId).toBe("folder-1");
    expect(folderRows).toEqual([
      { id: "folder-1", name: "工作", createdAt: 7 },
    ]);
  });
});

describe("文件夹迁移: 全新建库的表结构", () => {
  const getDirectory = useTemporaryDirectory("folder-migration-fresh");

  it("有文件夹表, 条目表的所属文件夹列允许为空, 没有数据时两张表都是空的", () => {
    const database = openLatest(
      join(getDirectory(), "vault.db"),
      randomBytes(32),
    );
    const folderColumns = database.orm.all<ColumnInfo>(
      sql`select name, "notnull" from pragma_table_info('folders') order by name`,
    );
    const entryColumn = database.orm.all<ColumnInfo>(
      sql`select name, "notnull" from pragma_table_info('entries') where name = 'folder_id'`,
    );
    const entryRows = database.orm.select().from(entries).all();
    const folderRows = database.orm.select().from(folders).all();
    database.close();

    expect(folderColumns).toEqual([
      { name: "created_at", notnull: 1 },
      { name: "id", notnull: 1 },
      { name: "name", notnull: 1 },
    ]);
    expect(entryColumn).toEqual([{ name: "folder_id", notnull: 0 }]);
    expect(entryRows).toEqual([]);
    expect(folderRows).toEqual([]);
  });
});

describe("文件夹迁移: 全新建库的读写", () => {
  const getDirectory = useTemporaryDirectory("folder-migration-fresh-write");

  it("新库里写入的条目所属文件夹按原样读回", () => {
    const database = openLatest(
      join(getDirectory(), "vault.db"),
      randomBytes(32),
    );
    database.orm
      .insert(folders)
      .values({ id: "folder-1", name: "工作", createdAt: 1 })
      .run();
    database.orm
      .insert(entries)
      .values({
        id: "e-1",
        name: "条目",
        type: "login",
        fields: {},
        notes: "",
        customFields: [],
        totp: null,
        folderId: "folder-1",
        createdAt: 2,
      })
      .run();
    const rows = database.orm.select().from(entries).all();
    database.close();

    expect(rows[0]?.folderId).toBe("folder-1");
  });
});
