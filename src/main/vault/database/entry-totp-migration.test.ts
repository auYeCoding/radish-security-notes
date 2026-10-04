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
 * 迁移日志里 TOTP 迁移之前已有的迁移个数: 0000 至 0004.
 */
const BEFORE_TOTP_MIGRATION_COUNT = 5;

/**
 * TOTP 迁移之前的库里带多行备注与自定义字段的一行.
 */
const RICH_ROW = sql`insert into entries (id, name, type, fields, notes, custom_fields, created_at) values ('old-1', '旧论坛', 'forum', '{"account":"a","password":"p","email":"","url":""}', '备注第一行
备注第二行', '[{"id":"f-1","label":"助记词","value":"a b","isHidden":true}]', 5)`;

/**
 * TOTP 迁移之前的库里只有名称的一行.
 */
const BARE_ROW = sql`insert into entries (id, name, type, fields, notes, custom_fields, created_at) values ('old-2', '只有名称', 'login', '{}', '', '[]', 6)`;

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
 * 旧库升级到最新结构后读出的两行: 内容不变, TOTP 与所属文件夹都为空.
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
    totp: null,
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

describe("条目表迁移: 0005 加入 TOTP 列", () => {
  const getDirectory = useTemporaryDirectory("entry-totp-migration");

  it("TOTP 迁移之前的旧条目升级后内容不变, TOTP 为空", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    const before = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: await createMigrationsFolderUpTo(
        getDirectory(),
        BEFORE_TOTP_MIGRATION_COUNT,
      ),
    });
    before.orm.run(RICH_ROW);
    before.orm.run(BARE_ROW);
    before.close();

    const upgraded = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const rows = upgraded.orm.select().from(entries).all();
    upgraded.close();

    expect(rows).toEqual(UPGRADED_ROWS);
  });
});

describe("条目表迁移: 0005 加入的 TOTP 列", () => {
  const getDirectory = useTemporaryDirectory("entry-totp-migration");

  it("TOTP 列允许为空, 升级后可以写入 TOTP 配置并原样读回", () => {
    const database = openVaultDatabase({
      databaseFile: join(getDirectory(), "vault.db"),
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const totp = {
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA256",
      digits: 8,
      periodSeconds: 60,
    } as const;

    database.orm
      .insert(entries)
      .values({
        id: "n-1",
        name: "新条目",
        type: "login",
        fields: {},
        notes: "",
        customFields: [],
        totp,
        createdAt: 1,
      })
      .run();
    const columns = database.orm.all<ColumnInfo>(
      sql`select name, "notnull" from pragma_table_info('entries') where name = 'totp'`,
    );
    const rows = database.orm.select().from(entries).all();
    database.close();

    expect(columns).toEqual([{ name: "totp", notnull: 0 }]);
    expect(rows[0]?.totp).toEqual(totp);
  });
});
