import { randomBytes } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../../testing/migrations-folder";
import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { entries } from "./entry-schema";
import { openVaultDatabase } from "./open-vault-database";

/**
 * 迁移日志里骨架阶段已有的迁移个数: 0000 建元数据表, 0001 建条目表.
 */
const LEGACY_MIGRATION_COUNT = 2;

/**
 * 迁移日志里一项迁移的形状, 测试只用到名称.
 */
interface JournalEntry {
  /**
   * 迁移文件的名称, 不含扩展名.
   */
  readonly tag: string;
}

/**
 * 迁移日志文件的形状, 测试只改写迁移列表.
 */
interface Journal {
  /**
   * 迁移列表, 按执行顺序排列.
   */
  readonly entries: readonly JournalEntry[];
}

/**
 * 在临时目录里建一个只含骨架阶段迁移 (0000 与 0001) 的迁移文件夹, 内容从项目的迁移文件夹复制.
 * @param directory 临时目录.
 * @returns 只含旧迁移的迁移文件夹路径.
 */
async function createLegacyMigrationsFolder(
  directory: string,
): Promise<string> {
  const legacyFolder = join(directory, "legacy-migrations");
  await mkdir(join(legacyFolder, "meta"), { recursive: true });
  const journalText = await readFile(
    join(MIGRATIONS_FOLDER, "meta", "_journal.json"),
    "utf8",
  );
  const journal = JSON.parse(journalText) as Journal;
  const legacyEntries = journal.entries.slice(0, LEGACY_MIGRATION_COUNT);
  for (const { tag } of legacyEntries) {
    await copyFile(
      join(MIGRATIONS_FOLDER, `${tag}.sql`),
      join(legacyFolder, `${tag}.sql`),
    );
  }
  await writeFile(
    join(legacyFolder, "meta", "_journal.json"),
    JSON.stringify({ ...journal, entries: legacyEntries }),
  );
  return legacyFolder;
}

describe("条目表迁移: 旧条目升级", () => {
  const getDirectory = useTemporaryDirectory("entry-columns-migration");

  it("骨架阶段已建的旧条目升级后照常读出, 新字段为空", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    const legacy = openVaultDatabase({
      databaseFile,
      dataKey,
      migrationsFolder: await createLegacyMigrationsFolder(getDirectory()),
    });
    legacy.orm.run(
      sql`insert into entries (id, name, account, password, created_at) values ('old-1', '旧论坛', 'old-account', 'old-password', 7)`,
    );
    legacy.close();

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
        account: "old-account",
        password: "old-password",
        url: "",
        notes: "",
        customFields: [],
        createdAt: 7,
      },
    ]);
  });
});

describe("条目表迁移: 新字段读写", () => {
  const getDirectory = useTemporaryDirectory("entry-columns-migration");

  it("升级后新写入的网址, 多行备注与自定义字段按原样读回", () => {
    const database = openVaultDatabase({
      databaseFile: join(getDirectory(), "vault.db"),
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    });
    const record = {
      id: "new-1",
      name: "钱包",
      account: "",
      password: "",
      url: "https://example.test/wallet",
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
      createdAt: 9,
    };

    database.orm.insert(entries).values(record).run();
    const rows = database.orm.select().from(entries).all();
    database.close();

    expect(rows).toEqual([record]);
  });
});
