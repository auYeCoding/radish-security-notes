import { describe, expect, it } from "vitest";

import type { AutoBackupStatus } from "@shared/email-backup/auto-backup-status";
import {
  emailBackupFailed,
  emailBackupSucceeded,
} from "@shared/email-backup/email-backup-result";

import {
  applyAutoBackup,
  applyAutoBackupSaved,
  applyLoadedAutoBackup,
} from "./email-backup-auto-state";
import {
  INITIAL_EMAIL_BACKUP_FLOW_STATE,
  startActivity,
} from "./email-backup-flow-state";

/**
 * 一个已开启, 每周一次的自动备份状态.
 */
const WEEKLY: AutoBackupStatus = {
  isEnabled: true,
  interval: "weekly",
  phase: "due",
};

describe("邮箱备份流程状态: 自动备份", () => {
  it("初始时自动备份关闭, 间隔是每天", () => {
    expect(INITIAL_EMAIL_BACKUP_FLOW_STATE.autoBackup).toEqual({
      isEnabled: false,
      interval: "daily",
      phase: "off",
    });
  });

  it("读到状态后写进流程状态, 其它字段不变", () => {
    const next = applyAutoBackup(INITIAL_EMAIL_BACKUP_FLOW_STATE, WEEKLY);
    expect(next.autoBackup).toEqual(WEEKLY);
    expect(next.view).toBe(INITIAL_EMAIL_BACKUP_FLOW_STATE.view);
  });

  it("读完设置后套用读到的状态, 读取失败时保持原状态", () => {
    expect(
      applyLoadedAutoBackup(
        INITIAL_EMAIL_BACKUP_FLOW_STATE,
        emailBackupSucceeded(WEEKLY),
      ).autoBackup,
    ).toEqual(WEEKLY);
    expect(
      applyLoadedAutoBackup(
        INITIAL_EMAIL_BACKUP_FLOW_STATE,
        emailBackupFailed("vault-locked"),
      ),
    ).toBe(INITIAL_EMAIL_BACKUP_FLOW_STATE);
  });

  it("保存成功后回到空闲, 用保存后的状态, 不留提示", () => {
    const saving = startActivity(
      INITIAL_EMAIL_BACKUP_FLOW_STATE,
      "saving-auto",
    );
    expect(saving.activity).toBe("saving-auto");
    const saved = applyAutoBackupSaved(saving, WEEKLY);
    expect(saved).toMatchObject({
      activity: "idle",
      autoBackup: WEEKLY,
      notice: { kind: "none" },
    });
  });
});
