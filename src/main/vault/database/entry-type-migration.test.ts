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
 * 迁移日志里类型迁移之前已有的迁移个数: 0000 至 0002.
 */
const BEFORE_TYPE_MIGRATION_COUNT = 3;

/**
 * 旧条目里带多行备注与自定义字段的一行, 用来验证升级后内容不变.
 */
const RICH_LEGACY_ROW = sql`insert into entries (id, name, account, password, url, notes, custom_fields, created_at) values ('old-1', '旧钱包', 'wallet-account', 'wallet-password', 'https://wallet.example.test', '备注第一行
备注第二行', '[{"id":"f-1","label":"助记词","value":"a b\\nc d","isHidden":true}]', 5)`;

/**
 * 旧条目里账号, 密码, 网址都为空的一行.
 */
const EMPTY_LEGACY_ROW = sql`insert into entries (id, name, account, password, url, notes, custom_fields, created_at) values ('old-2', '只有名称', '', '', '', '', '[]', 6)`;

/**
 * 表结构信息里的一列.
 */
interface ColumnInfo {
  /**
   * 列名.
   */
  readonly name: string;
}

/**
 * 升级后旧条目应有的两行: 账号, 密码与网址进了类型字段, 类型是通用登录, 其余内容不变.
 */
const UPGRADED_ROWS = [
  {
    id: "old-1",
    name: "旧钱包",
    type: "login",
    fields: {
      account: "wallet-account",
      password: "wallet-password",
      url: "https://wallet.example.test",
    },
    notes: "备注第一行\n备注第二行",
    notesFormat: "plain",
    customFields: [
      { id: "f-1", label: "助记词", value: "a b\nc d", isHidden: true },
    ],
    totp: null,
    folderId: null,
    createdAt: 5,
  },
  {
    id: "old-2",
    name: "只有名称",
    type: "login",
    fields: { account: "", password: "", url: "" },
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: null,
    folderId: null,
    createdAt: 6,
  },
];

describe("条目表迁移: 0003 与 0004 把旧条目归入通用登录", () => {
  const getDirectory = useTemporaryDirectory("entry-type-migration");

  it("0002 的旧条目升级后内容不变, 账号, 密码与网址进了类型字段", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    const before = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: await createMigrationsFolderUpTo(
        getDirectory(),
        BEFORE_TYPE_MIGRATION_COUNT,
      ),
    });
    before.orm.run(RICH_LEGACY_ROW);
    before.orm.run(EMPTY_LEGACY_ROW);
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

describe("条目表迁移: 升级后的表结构", () => {
  const getDirectory = useTemporaryDirectory("entry-type-migration");

  it("条目表不再有账号, 密码与网址三列, 多了 TOTP, 所属文件夹与备注格式三列", () => {
    const database = openVaultDatabase({
      databaseFile: join(getDirectory(), "vault.db"),
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const columns = database.orm.all<ColumnInfo>(
      sql`select name from pragma_table_info('entries')`,
    );
    database.close();

    expect(columns.map((column) => column.name).sort()).toEqual([
      "created_at",
      "custom_fields",
      "fields",
      "folder_id",
      "id",
      "name",
      "notes",
      "notes_format",
      "totp",
      "type",
    ]);
  });

  it("没有旧条目的新库升级后可以直接写入各类型条目", () => {
    const database = openVaultDatabase({
      databaseFile: join(getDirectory(), "vault.db"),
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    });

    database.orm
      .insert(entries)
      .values({
        id: "n-1",
        name: "工资卡",
        type: "bankCard",
        fields: { cardNumber: "6222" },
        notes: "",
        customFields: [],
        createdAt: 1,
      })
      .run();
    const rows = database.orm.select().from(entries).all();
    database.close();

    expect(rows[0]?.type).toBe("bankCard");
    expect(rows[0]?.fields).toEqual({ cardNumber: "6222" });
  });
});
