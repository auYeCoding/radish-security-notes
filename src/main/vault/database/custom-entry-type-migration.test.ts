import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../../testing/migrations-folder";
import { createMigrationsFolderUpTo } from "../../testing/partial-migrations-folder";
import { useTemporaryDirectory } from "../../testing/temporary-directory";
import {
  customEntryTypeFields,
  customEntryTypes,
} from "./custom-entry-type-schema";
import { entries } from "./entry-schema";
import { openVaultDatabase, type VaultDatabase } from "./open-vault-database";

/**
 * 迁移日志里自定义类型迁移之前已有的迁移个数: 0000 至 0009.
 */
const BEFORE_CUSTOM_ENTRY_TYPE_MIGRATION_COUNT = 10;

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
  /**
   * 在主键里的位置, 不是主键列时为 0.
   */
  readonly pk: number;
}

/**
 * 自定义类型迁移之前的库里放的两个条目.
 */
const LEGACY_ROWS = [
  "insert into entries (id, name, type, fields, notes, custom_fields, created_at) values ('old-1', '旧论坛', 'login', '{\"account\":\"a\"}', '备注', '[]', 7)",
  "insert into entries (id, name, type, fields, notes, custom_fields, created_at) values ('old-2', '旧银行', 'bankCard', '{}', '', '[]', 8)",
];

/**
 * 测试用的类型行.
 */
const TYPE_ROW = { id: "t1", name: "路由器", createdAt: 1 } as const;

/**
 * 测试用的字段行, 属于 `TYPE_ROW`.
 */
const FIELD_ROWS = [
  {
    typeId: "t1",
    key: "account",
    position: 0,
    name: "地址",
    kind: "singleLine",
    isSensitive: false,
  },
  {
    typeId: "t1",
    key: "field-a",
    position: 1,
    name: "口令",
    kind: "singleLine",
    isSensitive: true,
  },
] as const;

/**
 * 打开临时目录里的加密数据库, 迁移到最新结构.
 * @param directory 临时目录.
 * @param dataKey 数据密钥.
 * @returns 数据库句柄.
 */
function openLatest(directory: string, dataKey: Buffer): VaultDatabase {
  return openVaultDatabase({
    databaseFile: join(directory, "vault.db"),
    dataKey,
    migrationsFolder: MIGRATIONS_FOLDER,
  });
}

/**
 * 读取一张表的列信息, 按列的先后排列.
 * @param database 数据库句柄.
 * @param table 表名.
 * @returns 列信息.
 */
function columnsOf(database: VaultDatabase, table: string): ColumnInfo[] {
  return database.orm.all<ColumnInfo>(
    sql`select name, "notnull", pk from pragma_table_info(${table}) order by cid`,
  );
}

describe("自定义类型迁移: 从 0009 升级的旧库", () => {
  const getDirectory = useTemporaryDirectory("custom-type-migration-upgrade");

  it("旧条目升级后内容不丢, 两张类型表已建好且为空", async () => {
    const dataKey = randomBytes(32);
    const before = openVaultDatabase({
      databaseFile: join(getDirectory(), "vault.db"),
      dataKey,
      migrationsFolder: await createMigrationsFolderUpTo(
        getDirectory(),
        BEFORE_CUSTOM_ENTRY_TYPE_MIGRATION_COUNT,
      ),
    });
    LEGACY_ROWS.forEach((statement) => before.orm.run(sql.raw(statement)));
    before.close();

    const upgraded = openLatest(getDirectory(), dataKey);
    const rows = upgraded.orm.select().from(entries).orderBy(entries.id).all();
    const types = upgraded.orm.select().from(customEntryTypes).all();
    const fields = upgraded.orm.select().from(customEntryTypeFields).all();
    upgraded.close();

    expect(rows.map((row) => [row.id, row.type, row.createdAt])).toEqual([
      ["old-1", "login", 7],
      ["old-2", "bankCard", 8],
    ]);
    expect(rows[0]).toMatchObject({ fields: { account: "a" }, notes: "备注" });
    expect([types, fields]).toEqual([[], []]);
  });
});

describe("自定义类型迁移: 升级后的表结构", () => {
  const getDirectory = useTemporaryDirectory("custom-type-migration-columns");

  it("类型表有三列, 字段表的主键是类型编号加字段键, 各列都不允许为空", () => {
    const database = openLatest(getDirectory(), randomBytes(32));
    const typeColumns = columnsOf(database, "custom_entry_types");
    const fieldColumns = columnsOf(database, "custom_entry_type_fields");
    database.close();

    expect(typeColumns).toEqual([
      { name: "id", notnull: 1, pk: 1 },
      { name: "name", notnull: 1, pk: 0 },
      { name: "created_at", notnull: 1, pk: 0 },
    ]);
    expect(fieldColumns).toEqual([
      { name: "type_id", notnull: 1, pk: 1 },
      { name: "key", notnull: 1, pk: 2 },
      { name: "position", notnull: 1, pk: 0 },
      { name: "name", notnull: 1, pk: 0 },
      { name: "kind", notnull: 1, pk: 0 },
      { name: "is_sensitive", notnull: 1, pk: 0 },
    ]);
  });
});

describe("自定义类型迁移: 升级后的读写", () => {
  const getDirectory = useTemporaryDirectory("custom-type-migration-use");

  it("写入的类型与字段重新打开后仍在, 字段按位置读出", () => {
    const dataKey = randomBytes(32);
    const first = openLatest(getDirectory(), dataKey);
    first.orm.insert(customEntryTypes).values(TYPE_ROW).run();
    first.orm
      .insert(customEntryTypeFields)
      .values([...FIELD_ROWS])
      .run();
    first.close();

    const reopened = openLatest(getDirectory(), dataKey);
    const types = reopened.orm.select().from(customEntryTypes).all();
    const fields = reopened.orm
      .select()
      .from(customEntryTypeFields)
      .orderBy(customEntryTypeFields.position)
      .all();
    reopened.close();

    expect([types, fields]).toEqual([[TYPE_ROW], [...FIELD_ROWS]]);
  });

  it("同一类型里字段键重复时被主键拒绝", () => {
    const database = openLatest(getDirectory(), randomBytes(32));
    database.orm.insert(customEntryTypes).values(TYPE_ROW).run();
    database.orm.insert(customEntryTypeFields).values(FIELD_ROWS[0]).run();

    expect(() =>
      database.orm.insert(customEntryTypeFields).values(FIELD_ROWS[0]).run(),
    ).toThrow();
    database.close();
  });

  it("字段不能指向不存在的类型, 类型被删除时字段随之删除", () => {
    const database = openLatest(getDirectory(), randomBytes(32));

    expect(() =>
      database.orm.insert(customEntryTypeFields).values(FIELD_ROWS[0]).run(),
    ).toThrow();

    database.orm.insert(customEntryTypes).values(TYPE_ROW).run();
    database.orm
      .insert(customEntryTypeFields)
      .values([...FIELD_ROWS])
      .run();
    database.orm
      .delete(customEntryTypes)
      .where(eq(customEntryTypes.id, TYPE_ROW.id))
      .run();
    const remaining = database.orm.select().from(customEntryTypeFields).all();
    database.close();

    expect(remaining).toEqual([]);
  });
});
