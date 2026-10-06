import { describe, expect, it } from "vitest";

import { AUTO_BACKUP_INTERVAL_MILLISECONDS } from "@shared/email-backup/auto-backup-interval";

import {
  AUTO_BACKUP_MAX_FAILED_ATTEMPTS,
  afterAuthorizationCodeSaved,
  afterChoiceSaved,
  afterScheduledFailure,
  afterSuccess,
  findFailureWindowStart,
} from "./auto-backup-backoff";
import {
  DEFAULT_AUTO_BACKUP_SCHEDULE,
  type AutoBackupSchedule,
} from "./auto-backup-schedule";

/**
 * 一天的毫秒数, 也是默认间隔.
 */
const DAY = AUTO_BACKUP_INTERVAL_MILLISECONDS.daily;

/**
 * 测试里的当前时刻.
 */
const NOW = 100 * DAY;

/**
 * 一个已开启, 没有失败记录的计划.
 */
const ENABLED: AutoBackupSchedule = {
  ...DEFAULT_AUTO_BACKUP_SCHEDULE,
  isEnabled: true,
};

describe("自动备份失败记录", () => {
  it("第一次失败开启失败窗口, 记下次数, 原因与时刻", () => {
    expect(afterScheduledFailure(ENABLED, "connection-failed", NOW)).toEqual({
      ...ENABLED,
      lastAttemptAt: NOW,
      failureCount: 1,
      firstFailureAt: NOW,
      lastFailureReason: "connection-failed",
      lastFailureAt: NOW,
    });
  });

  it("窗口内再次失败次数加一, 窗口起点不变", () => {
    const first = afterScheduledFailure(ENABLED, "send-failed", NOW);
    const second = afterScheduledFailure(first, "connection-failed", NOW + 1);
    expect(second.failureCount).toBe(2);
    expect(second.firstFailureAt).toBe(NOW);
    expect(second.lastFailureReason).toBe("connection-failed");
  });

  it("窗口过了一个间隔后再失败, 从新窗口重新数", () => {
    const first = afterScheduledFailure(ENABLED, "send-failed", NOW);
    const later = afterScheduledFailure(first, "send-failed", NOW + DAY);
    expect(later.failureCount).toBe(1);
    expect(later.firstFailureAt).toBe(NOW + DAY);
  });
});

describe("自动备份失败分类", () => {
  it("认证失败暂停自动备份", () => {
    const schedule = afterScheduledFailure(
      ENABLED,
      "authentication-failed",
      NOW,
    );
    expect(schedule.isPaused).toBe(true);
    expect(schedule.lastFailureReason).toBe("authentication-failed");
  });

  it.each(["too-large", "server-rejected-size"] as const)(
    "%s 直接记满次数, 本窗口不再尝试",
    (reason) => {
      const schedule = afterScheduledFailure(ENABLED, reason, NOW);
      expect(schedule.failureCount).toBe(AUTO_BACKUP_MAX_FAILED_ATTEMPTS);
      expect(schedule.isPaused).toBe(false);
    },
  );

  it.each([
    "connection-failed",
    "send-failed",
    "attachment-missing",
    "write-failed",
    "unexpected-error",
  ] as const)("%s 不暂停, 只记一次失败", (reason) => {
    const schedule = afterScheduledFailure(ENABLED, reason, NOW);
    expect(schedule.isPaused).toBe(false);
    expect(schedule.failureCount).toBe(1);
  });
});

describe("自动备份失败窗口", () => {
  it("没有失败时没有窗口", () => {
    expect(findFailureWindowStart(ENABLED, NOW)).toBeUndefined();
  });

  it("窗口在第一次失败之后一个间隔结束, 起点晚于现在时作废", () => {
    const schedule = afterScheduledFailure(ENABLED, "send-failed", NOW);
    expect(findFailureWindowStart(schedule, NOW + DAY - 1)).toBe(NOW);
    expect(findFailureWindowStart(schedule, NOW + DAY)).toBeUndefined();
    expect(findFailureWindowStart(schedule, NOW - 1)).toBeUndefined();
  });
});

describe("自动备份状态转移", () => {
  const failedPaused = afterScheduledFailure(
    ENABLED,
    "authentication-failed",
    NOW,
  );

  it("成功清掉失败次数, 暂停与最近一次失败, 保留开关与间隔", () => {
    const cleared = afterSuccess({ ...failedPaused, interval: "weekly" });
    expect(cleared).toMatchObject({
      isEnabled: true,
      interval: "weekly",
      failureCount: 0,
      isPaused: false,
      lastFailureReason: undefined,
      lastFailureAt: undefined,
      firstFailureAt: undefined,
    });
  });
});

describe("自动备份恢复与开关", () => {
  const failedPaused = afterScheduledFailure(
    ENABLED,
    "authentication-failed",
    NOW,
  );

  it("重新保存授权码只恢复暂停的计划, 并保留最近一次失败的记录", () => {
    const resumed = afterAuthorizationCodeSaved(failedPaused);
    expect(resumed).toMatchObject({
      isPaused: false,
      failureCount: 0,
      firstFailureAt: undefined,
      lastFailureReason: "authentication-failed",
    });
    const retrying = afterScheduledFailure(ENABLED, "send-failed", NOW);
    expect(afterAuthorizationCodeSaved(retrying)).toBe(retrying);
  });

  it("从关闭到开启时清掉旧的失败状态, 开着改间隔与关闭都不清", () => {
    const off = { ...failedPaused, isEnabled: false };
    const turnedOn = afterChoiceSaved(off, {
      isEnabled: true,
      interval: "weekly",
    });
    expect(turnedOn).toMatchObject({
      isEnabled: true,
      interval: "weekly",
      isPaused: false,
      failureCount: 0,
      lastFailureReason: undefined,
    });
    const changed = afterChoiceSaved(failedPaused, {
      isEnabled: true,
      interval: "every-3-days",
    });
    expect(changed.isPaused).toBe(true);
    const turnedOff = afterChoiceSaved(failedPaused, {
      isEnabled: false,
      interval: "daily",
    });
    expect(turnedOff).toMatchObject({ isEnabled: false, isPaused: true });
  });
});
