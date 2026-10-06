import { describe, expect, it } from "vitest";

import {
  AUTO_BACKUP_INTERVALS,
  AUTO_BACKUP_INTERVAL_MILLISECONDS,
  DEFAULT_AUTO_BACKUP_INTERVAL,
  isAutoBackupInterval,
} from "./auto-backup-interval";
import {
  DEFAULT_EMAIL_BACKUP_TRIGGER_KIND,
  EMAIL_BACKUP_TRIGGER_KINDS,
  isEmailBackupTriggerKind,
} from "./email-backup-trigger-kind";

describe("自动备份间隔", () => {
  it("有每天, 每 3 天, 每周三种, 默认每天, 毫秒数是固定的整天数", () => {
    expect(AUTO_BACKUP_INTERVALS).toEqual(["daily", "every-3-days", "weekly"]);
    expect(DEFAULT_AUTO_BACKUP_INTERVAL).toBe("daily");
    const day = 24 * 60 * 60 * 1000;
    expect(AUTO_BACKUP_INTERVAL_MILLISECONDS).toEqual({
      daily: day,
      "every-3-days": 3 * day,
      weekly: 7 * day,
    });
  });

  it("只认登记过的间隔", () => {
    for (const interval of AUTO_BACKUP_INTERVALS) {
      expect(isAutoBackupInterval(interval)).toBe(true);
    }
    for (const bad of ["hourly", "", 1, undefined, null]) {
      expect(isAutoBackupInterval(bad)).toBe(false);
    }
  });
});

describe("邮箱备份触发方式", () => {
  it("有手动, 定时, 启动补发三种, 默认手动", () => {
    expect(EMAIL_BACKUP_TRIGGER_KINDS).toEqual([
      "manual",
      "scheduled",
      "catch-up",
    ]);
    expect(DEFAULT_EMAIL_BACKUP_TRIGGER_KIND).toBe("manual");
  });

  it("只认登记过的触发方式", () => {
    for (const kind of EMAIL_BACKUP_TRIGGER_KINDS) {
      expect(isEmailBackupTriggerKind(kind)).toBe(true);
    }
    for (const bad of ["auto", "", 1, undefined]) {
      expect(isEmailBackupTriggerKind(bad)).toBe(false);
    }
  });
});
