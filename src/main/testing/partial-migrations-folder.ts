import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { MIGRATIONS_FOLDER } from "./migrations-folder";

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
 * 在临时目录里建一个只含前若干项迁移的迁移文件夹, 内容从项目的迁移文件夹复制, 用来造出
 * 旧版本的数据库.
 * @param directory 临时目录.
 * @param migrationCount 保留的迁移个数, 从 0000 起按顺序数.
 * @returns 只含前若干项迁移的迁移文件夹路径.
 */
export async function createMigrationsFolderUpTo(
  directory: string,
  migrationCount: number,
): Promise<string> {
  const partialFolder = join(directory, `migrations-up-to-${migrationCount}`);
  await mkdir(join(partialFolder, "meta"), { recursive: true });
  const journalText = await readFile(
    join(MIGRATIONS_FOLDER, "meta", "_journal.json"),
    "utf8",
  );
  const journal = JSON.parse(journalText) as Journal;
  const keptEntries = journal.entries.slice(0, migrationCount);
  for (const { tag } of keptEntries) {
    await copyFile(
      join(MIGRATIONS_FOLDER, `${tag}.sql`),
      join(partialFolder, `${tag}.sql`),
    );
  }
  await writeFile(
    join(partialFolder, "meta", "_journal.json"),
    JSON.stringify({ ...journal, entries: keptEntries }),
  );
  return partialFolder;
}
