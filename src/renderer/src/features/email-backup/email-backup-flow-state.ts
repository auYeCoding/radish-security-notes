import {
  DEFAULT_AUTO_BACKUP_STATUS,
  type AutoBackupStatus,
} from "@shared/email-backup/auto-backup-status";
import {
  DEFAULT_EMAIL_BACKUP_SETTINGS,
  type EmailBackupSettingsView,
} from "@shared/email-backup/email-backup-settings";
import type {
  EmailBackupFailureReason,
  EmailBackupLastResult,
  EmailBackupRunOutcome,
  EmailBackupSummary,
} from "@shared/email-backup/email-backup-result";
import type { EmailProviderKey } from "@shared/email-backup/email-provider-presets";

import {
  applyProvider,
  draftFromView,
  type EmailBackupDraft,
} from "./email-backup-draft";

/**
 * 对话框当前正在做的事: 空闲, 保存设置, 保存自动备份的开关与间隔, 发送测试邮件, 立即备份.
 */
export type EmailBackupActivity =
  "idle" | "saving" | "saving-auto" | "testing" | "backing-up";

/**
 * 不带内容的提示: 没有提示, 设置已保存, 测试邮件已发出.
 */
export interface SimpleNotice {
  /**
   * 提示的种类.
   */
  readonly kind: "none" | "saved" | "test-sent";
}

/**
 * 备份已发出的提示, 带发送成功的摘要.
 */
export interface BackupSentNotice {
  /**
   * 提示的种类.
   */
  readonly kind: "backup-sent";
  /**
   * 发送成功的摘要.
   */
  readonly summary: EmailBackupSummary;
}

/**
 * 备份超出邮箱上限而没有发送的提示.
 */
export interface TooLargeNotice {
  /**
   * 提示的种类.
   */
  readonly kind: "too-large";
  /**
   * 估计的邮件字节数.
   */
  readonly estimatedSizeBytes: number;
  /**
   * 设置的单封上限的字节数.
   */
  readonly limitBytes: number;
  /**
   * 去掉附件后重发是否还有意义.
   */
  readonly canDropAttachments: boolean;
}

/**
 * 操作失败的提示, 带失败原因.
 */
export interface FailureNotice {
  /**
   * 提示的种类.
   */
  readonly kind: "failure";
  /**
   * 失败原因.
   */
  readonly reason: EmailBackupFailureReason;
}

/**
 * 状态区显示的提示.
 */
export type EmailBackupNotice =
  SimpleNotice | BackupSentNotice | TooLargeNotice | FailureNotice;

/**
 * 邮箱备份对话框的流程状态.
 */
export interface EmailBackupFlowState {
  /**
   * 设置的读取状态: 读取中, 读取失败, 已读到.
   */
  readonly loadStatus: "loading" | "failed" | "ready";
  /**
   * 已保存的设置视图.
   */
  readonly view: EmailBackupSettingsView;
  /**
   * 上次备份的结果, 从没备份过时为 undefined.
   */
  readonly lastResult: EmailBackupLastResult | undefined;
  /**
   * 自动备份的状态.
   */
  readonly autoBackup: AutoBackupStatus;
  /**
   * 用户正在填写的内容.
   */
  readonly draft: EmailBackupDraft;
  /**
   * 正在做的事.
   */
  readonly activity: EmailBackupActivity;
  /**
   * 状态区的提示.
   */
  readonly notice: EmailBackupNotice;
}

/**
 * 读取设置之前的视图: 没保存过, 都是默认值.
 */
const INITIAL_VIEW: EmailBackupSettingsView = {
  ...DEFAULT_EMAIL_BACKUP_SETTINGS,
  isSaved: false,
  hasAuthorizationCode: false,
  hasPassphrase: false,
  requiresMasterPassword: false,
};

/**
 * 对话框打开时的流程状态: 正在读取设置.
 */
export const INITIAL_EMAIL_BACKUP_FLOW_STATE: EmailBackupFlowState = {
  loadStatus: "loading",
  view: INITIAL_VIEW,
  lastResult: undefined,
  autoBackup: DEFAULT_AUTO_BACKUP_STATUS,
  draft: draftFromView(INITIAL_VIEW),
  activity: "idle",
  notice: { kind: "none" },
};

/**
 * 没有提示.
 */
const NO_NOTICE: EmailBackupNotice = { kind: "none" };

/**
 * 读到设置与上次结果: 填写内容取自设置.
 * @param state 当前状态.
 * @param view 已保存的设置视图.
 * @param lastResult 上次备份的结果.
 * @returns 新状态.
 */
export function applyLoaded(
  state: EmailBackupFlowState,
  view: EmailBackupSettingsView,
  lastResult: EmailBackupLastResult | undefined,
): EmailBackupFlowState {
  return {
    ...state,
    loadStatus: "ready",
    view,
    lastResult,
    draft: draftFromView(view),
  };
}

/**
 * 读取设置失败.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function applyLoadFailed(
  state: EmailBackupFlowState,
): EmailBackupFlowState {
  return { ...state, loadStatus: "failed" };
}

/**
 * 修改填写内容. 修改后失败提示作废, 其余提示保留.
 * @param state 当前状态.
 * @param changes 改动的字段.
 * @returns 新状态.
 */
export function changeDraft(
  state: EmailBackupFlowState,
  changes: Partial<EmailBackupDraft>,
): EmailBackupFlowState {
  return {
    ...state,
    draft: { ...state.draft, ...changes },
    notice: state.notice.kind === "failure" ? NO_NOTICE : state.notice,
  };
}

/**
 * 换邮箱类型, 服务器, 端口, 连接方式与上限换成这种类型的预置值.
 * @param state 当前状态.
 * @param provider 新选的邮箱类型.
 * @returns 新状态.
 */
export function changeProvider(
  state: EmailBackupFlowState,
  provider: EmailProviderKey,
): EmailBackupFlowState {
  return {
    ...state,
    draft: applyProvider(state.draft, provider),
    notice: NO_NOTICE,
  };
}

/**
 * 开始一件事: 提示清空.
 * @param state 当前状态.
 * @param activity 要做的事.
 * @returns 新状态.
 */
export function startActivity(
  state: EmailBackupFlowState,
  activity: Exclude<EmailBackupActivity, "idle">,
): EmailBackupFlowState {
  return { ...state, activity, notice: NO_NOTICE };
}

/**
 * 设置保存成功: 填写内容取自保存后的设置, 授权码, 口令清空, 主密码保留供随后的立即备份用.
 * @param state 当前状态.
 * @param view 保存后的设置视图.
 * @returns 新状态.
 */
export function applySaved(
  state: EmailBackupFlowState,
  view: EmailBackupSettingsView,
): EmailBackupFlowState {
  return {
    ...state,
    view,
    draft: {
      ...draftFromView(view),
      masterPassword: state.draft.masterPassword,
    },
    activity: "idle",
    notice: { kind: "saved" },
  };
}

/**
 * 一件事失败: 回到空闲, 提示失败原因; 主密码不对时清空主密码.
 * @param state 当前状态.
 * @param reason 失败原因.
 * @returns 新状态.
 */
export function applyFailed(
  state: EmailBackupFlowState,
  reason: EmailBackupFailureReason,
): EmailBackupFlowState {
  return {
    ...state,
    activity: "idle",
    notice: { kind: "failure", reason },
    draft:
      reason === "wrong-master-password"
        ? { ...state.draft, masterPassword: "" }
        : state.draft,
  };
}

/**
 * 测试邮件发出.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function applyTestSent(
  state: EmailBackupFlowState,
): EmailBackupFlowState {
  return { ...state, activity: "idle", notice: { kind: "test-sent" } };
}

/**
 * 立即备份有了结果: 已发出, 或估计超出上限而没有发送.
 * @param state 当前状态.
 * @param outcome 立即备份的结果.
 * @returns 新状态.
 */
export function applyBackupOutcome(
  state: EmailBackupFlowState,
  outcome: EmailBackupRunOutcome,
): EmailBackupFlowState {
  if (outcome.status === "sent") {
    return {
      ...state,
      activity: "idle",
      notice: { kind: "backup-sent", summary: outcome.summary },
    };
  }
  return {
    ...state,
    activity: "idle",
    notice: {
      kind: "too-large",
      estimatedSizeBytes: outcome.estimatedSizeBytes,
      limitBytes: outcome.limitBytes,
      canDropAttachments: outcome.canDropAttachments,
    },
  };
}

/**
 * 刷新上次备份的结果.
 * @param state 当前状态.
 * @param lastResult 最新的上次结果.
 * @returns 新状态.
 */
export function applyLastResult(
  state: EmailBackupFlowState,
  lastResult: EmailBackupLastResult | undefined,
): EmailBackupFlowState {
  return { ...state, lastResult };
}

/**
 * 关掉状态区的提示, 例如超限后选 "取消".
 * @param state 当前状态.
 * @returns 新状态.
 */
export function dismissNotice(
  state: EmailBackupFlowState,
): EmailBackupFlowState {
  return { ...state, notice: NO_NOTICE };
}
