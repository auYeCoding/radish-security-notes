import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../../testing/migrations-folder";
import { createMigrationsFolderUpTo } from "../../testing/partial-migrations-folder";
import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { emailBackupLastResults } from "./email-backup-last-result-schema";
import { emailBackupSchedule } from "./email-backup-schedule-schema";
import { openVaultDatabase } from "./open-vault-database";

/**
 * 迁移日志里自动备份迁移之前已有的迁移个数: 0000 至 0011.
 */
const BEFORE_SCHEDULE_MIGRATION_COUNT = 12;

/**
 * 自动备份迁移之前的库里 0039 留下的上次结果行.
 * @param outcome 成功或失败.
 * @returns 写入这一行的语句.
 */
function legacyLastResult(outcome: "success" | "failure"): string {
  return `insert into email_backup_last_results (id, completed_at, outcome, reason) values (1, 777, '${outcome}', null)`;
}

describe("自动备份迁移: 从 0011 升级的旧库", () => {
  const getDirectory = useTemporaryDirectory("email-schedule-migration");

  it.each([
    ["success", 777],
    ["failure", null],
  ] as const)(
    "旧的%s结果升级后保留, 触发方式补成手动, 上次成功时间为 %s",
    async (outcome, expectedLastSuccessAt) => {
      const databaseFile = join(getDirectory(), "vault.db");
      const dataKey = randomBytes(32);
      const before = openVaultDatabase({
        databaseFile,
        dataKey,
        migrationsFolder: await createMigrationsFolderUpTo(
          getDirectory(),
          BEFORE_SCHEDULE_MIGRATION_COUNT,
        ),
      });
      before.orm.run(sql.raw(legacyLastResult(outcome)));
      before.close();

      const upgraded = openVaultDatabase({
        databaseFile,
        dataKey,
        migrationsFolder: MIGRATIONS_FOLDER,
      });
      const rows = upgraded.orm.select().from(emailBackupLastResults).all();
      const schedules = upgraded.orm.select().from(emailBackupSchedule).all();
      upgraded.close();

      expect(rows).toEqual([
        {
          id: 1,
          completedAt: 777,
          outcome,
          reason: null,
          triggerKind: "manual",
          lastSuccessAt: expectedLastSuccessAt,
        },
      ]);
      expect(schedules).toEqual([]);
    },
  );
});
