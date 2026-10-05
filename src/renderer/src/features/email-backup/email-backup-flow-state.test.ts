import { describe, expect, it } from "vitest";

import {
  FAKE_EMAIL_BACKUP_SUMMARY,
  FAKE_EMAIL_BACKUP_VIEW,
} from "@renderer/testing/fake-email-backup-bridge";

import {
  applyBackupOutcome,
  applyFailed,
  applyLastResult,
  applyLoadFailed,
  applyLoaded,
  applySaved,
  applyTestSent,
  changeDraft,
  changeProvider,
  dismissNotice,
  INITIAL_EMAIL_BACKUP_FLOW_STATE,
  startActivity,
  type EmailBackupFlowState,
} from "./email-backup-flow-state";

/**
 * 已读到设置的流程状态.
 */
const READY: EmailBackupFlowState = applyLoaded(
  INITIAL_EMAIL_BACKUP_FLOW_STATE,
  { ...FAKE_EMAIL_BACKUP_VIEW, senderAddress: "alice@qq.com", isSaved: true },
  undefined,
);

describe("邮箱备份流程状态: 读取设置", () => {
  it("初始是读取中, 没有提示, 空闲", () => {
    expect(INITIAL_EMAIL_BACKUP_FLOW_STATE).toMatchObject({
      loadStatus: "loading",
      activity: "idle",
      notice: { kind: "none" },
    });
  });

  it("读到设置后填写内容取自设置, 读取失败时标记失败", () => {
    expect(READY.loadStatus).toBe("ready");
    expect(READY.draft.senderAddress).toBe("alice@qq.com");
    expect(applyLoadFailed(INITIAL_EMAIL_BACKUP_FLOW_STATE).loadStatus).toBe(
      "failed",
    );
  });
});

describe("邮箱备份流程状态: 修改填写内容", () => {
  it("修改后失败提示作废, 其余提示保留", () => {
    const failed = applyFailed(READY, "send-failed");
    const sent = applyTestSent(READY);
    expect(changeDraft(failed, { senderAddress: "b@qq.com" }).notice).toEqual({
      kind: "none",
    });
    expect(changeDraft(sent, { senderAddress: "b@qq.com" }).notice).toEqual({
      kind: "test-sent",
    });
  });

  it("换邮箱类型时填入预置值并清除提示", () => {
    const changed = changeProvider(applyFailed(READY, "send-failed"), "gmail");
    expect(changed.draft).toMatchObject({
      provider: "gmail",
      host: "smtp.gmail.com",
    });
    expect(changed.notice.kind).toBe("none");
  });
});

describe("邮箱备份流程状态: 动作与结果", () => {
  it("开始一件事时提示清空, 失败后回到空闲并带原因", () => {
    const started = startActivity(applyTestSent(READY), "backing-up");
    expect(started).toMatchObject({
      activity: "backing-up",
      notice: { kind: "none" },
    });
    expect(applyFailed(started, "connection-failed")).toMatchObject({
      activity: "idle",
      notice: { kind: "failure", reason: "connection-failed" },
    });
  });

  it("主密码不对时清空主密码, 其它失败保留", () => {
    const typed = changeDraft(READY, { masterPassword: "m" });
    expect(
      applyFailed(typed, "wrong-master-password").draft.masterPassword,
    ).toBe("");
    expect(applyFailed(typed, "send-failed").draft.masterPassword).toBe("m");
  });

  it("保存成功后机密清空, 主密码保留, 提示已保存", () => {
    const typed = changeDraft(READY, {
      authorizationCode: "code",
      passphrase: "phrase",
      masterPassword: "m",
    });
    const saved = applySaved(typed, {
      ...READY.view,
      hasAuthorizationCode: true,
    });
    expect(saved.draft).toMatchObject({
      authorizationCode: "",
      passphrase: "",
      masterPassword: "m",
    });
    expect(saved).toMatchObject({
      activity: "idle",
      notice: { kind: "saved" },
    });
  });
});

describe("邮箱备份流程状态: 备份结果", () => {
  it("已发出时提示摘要, 超出上限时提示大小与上限", () => {
    expect(
      applyBackupOutcome(READY, {
        status: "sent",
        summary: FAKE_EMAIL_BACKUP_SUMMARY,
      }).notice,
    ).toEqual({ kind: "backup-sent", summary: FAKE_EMAIL_BACKUP_SUMMARY });
    expect(
      applyBackupOutcome(READY, {
        status: "too-large",
        estimatedSizeBytes: 3,
        limitBytes: 2,
        canDropAttachments: true,
      }).notice,
    ).toEqual({
      kind: "too-large",
      estimatedSizeBytes: 3,
      limitBytes: 2,
      canDropAttachments: true,
    });
  });

  it("刷新上次结果, 关掉提示", () => {
    const last = { completedAt: 1, outcome: "success" as const };
    expect(applyLastResult(READY, last).lastResult).toEqual(last);
    expect(dismissNotice(applyTestSent(READY)).notice.kind).toBe("none");
  });
});
