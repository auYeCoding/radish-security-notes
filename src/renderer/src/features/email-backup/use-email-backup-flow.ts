import { useState } from "react";

import type { EmailBackupProgressSnapshot } from "@shared/email-backup/email-backup-progress";
import type { EmailProviderKey } from "@shared/email-backup/email-provider-presets";

import { useEmailBackupBridge } from "@renderer/stores/use-email-backup-bridge";

import type { EmailBackupDraft } from "./email-backup-draft";
import {
  changeDraft,
  changeProvider,
  dismissNotice,
  INITIAL_EMAIL_BACKUP_FLOW_STATE,
  type EmailBackupFlowState,
} from "./email-backup-flow-state";
import { useEmailBackupProgress } from "./use-email-backup-progress";
import { useLoadEmailBackupSettings } from "./use-email-backup-settings";
import {
  useEmailBackupWork,
  type EmailBackupWork,
} from "./use-email-backup-work";

/**
 * 邮箱备份对话框的流程: 状态, 备份进度与全部操作.
 */
export interface EmailBackupFlow extends EmailBackupWork {
  /**
   * 当前流程状态.
   */
  readonly state: EmailBackupFlowState;
  /**
   * 最近一次读到的备份进度, 没有备份时为 undefined.
   */
  readonly progress: EmailBackupProgressSnapshot | undefined;
  /**
   * 改动填写内容.
   * @param changes 改动的字段.
   */
  readonly changeDraft: (changes: Partial<EmailBackupDraft>) => void;
  /**
   * 换邮箱类型.
   * @param provider 新选的邮箱类型.
   */
  readonly changeProvider: (provider: EmailProviderKey) => void;
  /**
   * 关掉状态区的提示.
   */
  readonly dismissNotice: () => void;
}

/**
 * 邮箱备份对话框的流程: 挂载时读取设置, 持有流程状态, 备份期间轮询进度, 提供改动填写内容与
 * 三个动作.
 * @returns 流程.
 */
export function useEmailBackupFlow(): EmailBackupFlow {
  const bridge = useEmailBackupBridge();
  const [state, setState] = useState(INITIAL_EMAIL_BACKUP_FLOW_STATE);
  useLoadEmailBackupSettings(bridge, setState);
  const progress = useEmailBackupProgress(state.activity === "backing-up");
  const work = useEmailBackupWork({ bridge, state, setState });
  return {
    ...work,
    state,
    progress,
    changeDraft: (changes) =>
      setState((current) => changeDraft(current, changes)),
    changeProvider: (provider) =>
      setState((current) => changeProvider(current, provider)),
    dismissNotice: () => setState((current) => dismissNotice(current)),
  };
}
