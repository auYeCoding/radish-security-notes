import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../../testing/migrations-folder";
import { createMigrationsFolderUpTo } from "../../testing/partial-migrations-folder";
import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { entries } from "./entry-schema";
import { openVaultDatabase } from "./open-vault-database";

/**
 * 迁移日志里备注格式迁移之前已有的迁移个数: 0000 至 0008.
 */
const BEFORE_NOTES_FORMAT_MIGRATION_COUNT = 9;

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
   * 列的默认值的 SQL 文本.
   */
  readonly dflt_value: string | null;
}

/**
 * 备注格式迁移之前的库里放的两个条目: 一个带多行备注, 一个没有备注.
 */
const LEGACY_ROWS = [
  "insert into entries (id, name, type, fields, notes, custom_fields, created_at) values ('old-1', '旧论坛', 'login', '{\"account\":\"a\"}', '# 看起来像标题的备注\n- 第二行', '[]', 7)",
  "insert into entries (id, name, type, fields, notes, custom_fields, created_at) values ('old-2', '旧银行', 'login', '{}', '', '[]', 8)",
];

/**
 * 写入新库用的条目, 没有指明备注格式, 备注是带 Markdown 标记的原文.
 */
const BARE_RECORD = {
  id: "bare",
  name: "bare",
  type: "login",
  fields: {},
  notes: "**粗体**",
  customFields: [],
  totp: null,
  folderId: null,
  createdAt: 1,
} as const;

describe("备注格式迁移: 从 0008 升级的旧库", () => {
  const getDirectory = useTemporaryDirectory("notes-format-migration-upgrade");

  it("旧条目升级后内容不丢, 备注原文不变, 备注格式都是纯文本", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    const before = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: await createMigrationsFolderUpTo(
        getDirectory(),
        BEFORE_NOTES_FORMAT_MIGRATION_COUNT,
      ),
    });
    for (const statement of LEGACY_ROWS) {
      before.orm.run(sql.raw(statement));
    }
    before.close();

    const upgraded = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const rows = upgraded.orm.select().from(entries).orderBy(entries.id).all();
    upgraded.close();

    expect(rows.map((row) => row.id)).toEqual(["old-1", "old-2"]);
    expect(rows[0]).toMatchObject({
      name: "旧论坛",
      fields: { account: "a" },
      notes: "# 看起来像标题的备注\n- 第二行",
      notesFormat: "plain",
      createdAt: 7,
    });
    expect(rows[1]).toMatchObject({
      name: "旧银行",
      notes: "",
      notesFormat: "plain",
      createdAt: 8,
    });
  });
});

describe("备注格式迁移: 升级后的表结构与读写", () => {
  const getDirectory = useTemporaryDirectory("notes-format-migration-use");

  it("备注格式列不允许为空, 默认值是纯文本", () => {
    const database = openVaultDatabase({
      databaseFile: join(getDirectory(), "vault.db"),
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const columns = database.orm.all<ColumnInfo>(
      sql`select name, "notnull", dflt_value from pragma_table_info('entries') where name = 'notes_format'`,
    );
    database.close();

    expect(columns).toEqual([
      { name: "notes_format", notnull: 1, dflt_value: "'plain'" },
    ]);
  });

  it("升级后写入的 Markdown 格式重新打开后仍在, 没有指明格式的行是纯文本", () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    const first = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    first.orm
      .insert(entries)
      .values({ ...BARE_RECORD, id: "md", notesFormat: "markdown" })
      .run();
    first.orm
      .insert(entries)
      .values({ ...BARE_RECORD, id: "plain" })
      .run();
    first.close();

    const reopened = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const rows = reopened.orm.select().from(entries).orderBy(entries.id).all();
    reopened.close();

    expect(rows.map((row) => [row.id, row.notesFormat])).toEqual([
      ["md", "markdown"],
      ["plain", "plain"],
    ]);
  });
});
