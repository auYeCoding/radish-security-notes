import { describe, expect, it } from "vitest";

import { useVaultDatabase } from "../testing/use-vault-database";
import {
  DEFAULT_AUTO_BACKUP_SCHEDULE,
  type AutoBackupSchedule,
} from "./auto-backup-schedule";
import {
  readSchedule,
  updateExistingSchedule,
  writeSchedule,
} from "./auto-backup-schedule-repository";

describe("自动备份计划表", () => {
  const getDatabase = useVaultDatabase("auto-backup-schedule-repository");

  it("没保存过时读到 undefined, 保存后读回全部字段, 再保存覆盖同一行", () => {
    const { orm } = getDatabase();
    expect(readSchedule(orm)).toBeUndefined();
    const schedule = {
      isEnabled: true,
      interval: "weekly",
      lastAttemptAt: 5,
      failureCount: 2,
      firstFailureAt: 3,
      isPaused: true,
      lastFailureReason: "authentication-failed",
      lastFailureAt: 5,
    } as const;
    writeSchedule(orm, schedule);
    expect(readSchedule(orm)).toEqual(schedule);
    writeSchedule(orm, DEFAULT_AUTO_BACKUP_SCHEDULE);
    expect(readSchedule(orm)).toEqual(DEFAULT_AUTO_BACKUP_SCHEDULE);
  });

  it("updateExistingSchedule 只改已有的计划, 没保存过时不新建", () => {
    const { orm } = getDatabase();
    const turnOn = (schedule: AutoBackupSchedule): AutoBackupSchedule => ({
      ...schedule,
      isEnabled: true,
    });
    updateExistingSchedule(orm, turnOn);
    expect(readSchedule(orm)).toBeUndefined();
    writeSchedule(orm, DEFAULT_AUTO_BACKUP_SCHEDULE);
    updateExistingSchedule(orm, turnOn);
    expect(readSchedule(orm)).toEqual({
      ...DEFAULT_AUTO_BACKUP_SCHEDULE,
      isEnabled: true,
    });
  });
});
