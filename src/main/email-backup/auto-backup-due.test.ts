import { describe, expect, it } from "vitest";

import { AUTO_BACKUP_INTERVAL_MILLISECONDS } from "@shared/email-backup/auto-backup-interval";

import { AUTO_BACKUP_RETRY_WAIT_MILLISECONDS } from "./auto-backup-backoff";
import { evaluateAutoBackup } from "./auto-backup-due";
import {
  DEFAULT_AUTO_BACKUP_SCHEDULE,
  type AutoBackupSchedule,
} from "./auto-backup-schedule";

/**
 * 一天的毫秒数, 也是默认间隔.
 */
const DAY = AUTO_BACKUP_INTERVAL_MILLISECONDS.daily;

/**
 * 失败后的退避等待, 一小时.
 */
const HOUR = AUTO_BACKUP_RETRY_WAIT_MILLISECONDS;

/**
 * 测试里的当前时刻, 离 1970 年足够远, 减去几个间隔也不会成负数.
 */
const NOW = 100 * DAY;

/**
 * 造一个已开启的计划.
 * @param overrides 要覆盖的字段.
 * @returns 计划.
 */
function enabled(
  overrides: Partial<AutoBackupSchedule> = {},
): AutoBackupSchedule {
  return { ...DEFAULT_AUTO_BACKUP_SCHEDULE, isEnabled: true, ...overrides };
}

describe("自动备份到期判断: 开关与暂停", () => {
  it("关闭时不备份, 阶段为 off", () => {
    expect(
      evaluateAutoBackup(NOW, DEFAULT_AUTO_BACKUP_SCHEDULE, undefined),
    ).toEqual({ phase: "off" });
  });

  it("因认证失败暂停时不备份, 阶段为 paused", () => {
    expect(
      evaluateAutoBackup(NOW, enabled({ isPaused: true }), NOW - 10 * DAY),
    ).toEqual({ phase: "paused" });
  });
});

describe("自动备份到期判断: 距上次成功满一个间隔", () => {
  it("没有成功记录时现在就该备份", () => {
    expect(evaluateAutoBackup(NOW, enabled(), undefined)).toEqual({
      phase: "due",
    });
  });

  it("距上次成功不满一个间隔时等待, 下次时刻是上次成功加间隔", () => {
    expect(evaluateAutoBackup(NOW, enabled(), NOW - HOUR)).toEqual({
      phase: "scheduled",
      nextRunAt: NOW - HOUR + DAY,
    });
  });

  it("刚好满一个间隔时就该备份", () => {
    expect(evaluateAutoBackup(NOW, enabled(), NOW - DAY)).toEqual({
      phase: "due",
    });
  });

  it("每 3 天与每周按各自的间隔判断", () => {
    const threeDays = enabled({ interval: "every-3-days" });
    const weekly = enabled({ interval: "weekly" });
    expect(evaluateAutoBackup(NOW, threeDays, NOW - 2 * DAY).phase).toBe(
      "scheduled",
    );
    expect(evaluateAutoBackup(NOW, threeDays, NOW - 3 * DAY).phase).toBe("due");
    expect(evaluateAutoBackup(NOW, weekly, NOW - 6 * DAY).phase).toBe(
      "scheduled",
    );
    expect(evaluateAutoBackup(NOW, weekly, NOW - 7 * DAY).phase).toBe("due");
  });

  it("上次成功晚于现在 (时钟被往回拨) 时当作没有成功记录", () => {
    expect(evaluateAutoBackup(NOW, enabled(), NOW + 5 * DAY)).toEqual({
      phase: "due",
    });
  });
});

/**
 * 造一个已开启且刚失败过一次的计划.
 * @param overrides 要覆盖的字段.
 * @returns 计划.
 */
function failed(overrides: Partial<AutoBackupSchedule>): AutoBackupSchedule {
  return enabled({
    failureCount: 1,
    firstFailureAt: NOW - HOUR / 2,
    lastAttemptAt: NOW - HOUR / 2,
    ...overrides,
  });
}

describe("自动备份到期判断: 失败退避", () => {
  it("失败后一小时内不再尝试, 下次时刻是上次尝试加一小时", () => {
    expect(evaluateAutoBackup(NOW, failed({}), undefined)).toEqual({
      phase: "backing-off",
      nextRunAt: NOW - HOUR / 2 + HOUR,
    });
  });

  it("失败满一小时后可以再尝试", () => {
    const schedule = failed({ lastAttemptAt: NOW - HOUR });
    expect(evaluateAutoBackup(NOW, schedule, undefined)).toEqual({
      phase: "due",
    });
  });

  it("同一个间隔内失败 3 次后不再尝试, 直到失败窗口结束", () => {
    const schedule = failed({
      failureCount: 3,
      firstFailureAt: NOW - 2 * HOUR,
      lastAttemptAt: NOW - HOUR,
    });
    expect(evaluateAutoBackup(NOW, schedule, undefined)).toEqual({
      phase: "exhausted",
      nextRunAt: NOW - 2 * HOUR + DAY,
    });
  });
});

describe("自动备份到期判断: 失败窗口与时钟调整", () => {
  it("失败窗口过了一个间隔后失败次数作废, 重新开始", () => {
    const schedule = failed({
      failureCount: 3,
      firstFailureAt: NOW - DAY,
      lastAttemptAt: NOW - DAY + HOUR,
    });
    expect(evaluateAutoBackup(NOW, schedule, undefined)).toEqual({
      phase: "due",
    });
  });

  it("失败时刻晚于现在 (时钟被往回拨) 时失败状态作废", () => {
    const schedule = failed({
      failureCount: 3,
      firstFailureAt: NOW + HOUR,
      lastAttemptAt: NOW + HOUR,
    });
    expect(evaluateAutoBackup(NOW, schedule, undefined)).toEqual({
      phase: "due",
    });
  });

  it("上次尝试晚于现在时视为退避已过", () => {
    const schedule = failed({ lastAttemptAt: NOW + HOUR });
    expect(evaluateAutoBackup(NOW, schedule, undefined)).toEqual({
      phase: "due",
    });
  });
});
