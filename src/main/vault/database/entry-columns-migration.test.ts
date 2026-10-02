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
 * 迁移日志里骨架阶段已有的迁移个数: 0000 建元数据表, 0001 建条目表.
 */
const SKELETON_MIGRATION_COUNT = 2;

describe("条目表迁移: 骨架阶段的旧条目升级", () => {
  const getDirectory = useTemporaryDirectory("entry-columns-migration");

  it("骨架阶段已建的旧条目升级后照常读出, 归入通用登录, 新字段为空", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    const skeleton = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: await createMigrationsFolderUpTo(
        getDirectory(),
        SKELETON_MIGRATION_COUNT,
      ),
    });
    skeleton.orm.run(
      sql`insert into entries (id, name, account, password, created_at) values ('old-1', '旧论坛', 'old-account', 'old-password', 7)`,
    );
    skeleton.close();

    const upgraded = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const rows = upgraded.orm.select().from(entries).all();
    upgraded.close();

    expect(rows).toEqual([
      {
        id: "old-1",
        name: "旧论坛",
        type: "login",
        fields: { account: "old-account", password: "old-password", url: "" },
        notes: "",
        customFields: [],
        totp: null,
        createdAt: 7,
      },
    ]);
  });
});

describe("条目表迁移: 类型字段, 备注与自定义字段读写", () => {
  const getDirectory = useTemporaryDirectory("entry-columns-migration");

  it("升级后新写入的类型字段, 多行备注与自定义字段按原样读回", () => {
    const database = openVaultDatabase({
      databaseFile: join(getDirectory(), "vault.db"),
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const record = {
      id: "new-1",
      name: "钱包",
      type: "cryptoWallet" as const,
      fields: {
        walletAddress: "0xabc",
        recoveryPhrase: "a b c\nd e f",
      },
      notes: "第一行\n第二行",
      customFields: [
        {
          id: "field-1",
          label: "助记词",
          value: "a b c\nd e f",
          isHidden: true,
        },
        { id: "field-2", label: "编号", value: "", isHidden: false },
      ],
      totp: null,
      createdAt: 9,
    };

    database.orm.insert(entries).values(record).run();
    const rows = database.orm.select().from(entries).all();
    database.close();

    expect(rows).toEqual([record]);
  });
});
