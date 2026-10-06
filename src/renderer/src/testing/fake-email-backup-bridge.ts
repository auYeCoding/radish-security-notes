import { vi } from "vitest";

import {
  DEFAULT_AUTO_BACKUP_STATUS,
  type AutoBackupSaveRequest,
  type AutoBackupStatus,
} from "@shared/email-backup/auto-backup-status";
import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";
import {
  emailBackupFailed,
  emailBackupSucceeded,
  type EmailBackupFailureReason,
  type EmailBackupSummary,
} from "@shared/email-backup/email-backup-result";
import {
  DEFAULT_EMAIL_BACKUP_SETTINGS,
  type EmailBackupSettingsInput,
  type EmailBackupSettingsView,
} from "@shared/email-backup/email-backup-settings";

/**
 * 假邮箱备份桥里读取设置返回的视图: 还没保存过, 没有授权码与口令, 不要求主密码.
 */
export const FAKE_EMAIL_BACKUP_VIEW: EmailBackupSettingsView = {
  ...DEFAULT_EMAIL_BACKUP_SETTINGS,
  isSaved: false,
  hasAuthorizationCode: false,
  hasPassphrase: false,
  requiresMasterPassword: false,
};

/**
 * 已保存过设置的视图: QQ 邮箱, 加密, 已设置授权码与口令, 不要求主密码.
 */
export const FAKE_SAVED_EMAIL_BACKUP_VIEW: EmailBackupSettingsView = {
  ...FAKE_EMAIL_BACKUP_VIEW,
  senderAddress: "alice@qq.com",
  isSaved: true,
  hasAuthorizationCode: true,
  hasPassphrase: true,
};

/**
 * 假邮箱备份桥里立即备份成功返回的摘要: 8 条条目, 3 个附件, 共 5 MB, 口令加密.
 */
export const FAKE_EMAIL_BACKUP_SUMMARY: EmailBackupSummary = {
  completedAt: new Date(2026, 9, 5, 20, 30).getTime(),
  fileSizeBytes: 5 * 1024 * 1024,
  entryCount: 8,
  attachmentCount: 3,
  includesAttachments: true,
  isEncrypted: true,
};

/**
 * 由保存设置的请求得出假桥返回的视图: 设置原样带回, 授权码与口令只留已设置标志.
 * @param input 保存设置的请求.
 * @returns 保存后的设置视图.
 */
function viewOfInput(input: EmailBackupSettingsInput): EmailBackupSettingsView {
  return {
    provider: input.provider,
    host: input.host,
    port: input.port,
    security: input.security,
    senderAddress: input.senderAddress,
    recipientAddress: input.recipientAddress,
    sizeLimitMebibytes: input.sizeLimitMebibytes,
    isEncrypted: input.isEncrypted,
    hasAcknowledgedPlaintextRisk: input.hasAcknowledgedPlaintextRisk,
    isSaved: true,
    hasAuthorizationCode: true,
    hasPassphrase: input.isEncrypted,
    requiresMasterPassword: false,
  };
}

/**
 * 由保存自动备份的请求得出假桥返回的状态: 开关与间隔原样带回, 打开时阶段是已到点.
 * @param request 保存自动备份的请求.
 * @returns 保存后的自动备份状态.
 */
function statusOfRequest(request: AutoBackupSaveRequest): AutoBackupStatus {
  return {
    isEnabled: request.isEnabled,
    interval: request.interval,
    phase: request.isEnabled ? "due" : "off",
  };
}

/**
 * 创建组件测试用的假邮箱备份桥: 每个方法都是间谍, 读取设置返回未保存过的默认值, 保存设置把设置带
 * 回, 发送测试与立即备份成功, 进度是空闲, 没有上次结果, 自动备份关闭, 保存自动备份把开关与间隔
 * 带回.
 * @param overrides 覆盖假桥上的方法, 例如让发送失败.
 * @returns 假邮箱备份桥.
 */
export function createFakeEmailBackupBridge(
  overrides: Partial<EmailBackupBridge> = {},
): EmailBackupBridge {
  return {
    getSettings: vi.fn(() =>
      Promise.resolve(emailBackupSucceeded(FAKE_EMAIL_BACKUP_VIEW)),
    ),
    saveSettings: vi.fn((input: EmailBackupSettingsInput) =>
      Promise.resolve(emailBackupSucceeded(viewOfInput(input))),
    ),
    sendTest: vi.fn(() => Promise.resolve(emailBackupSucceeded(undefined))),
    runBackup: vi.fn(() =>
      Promise.resolve(
        emailBackupSucceeded({
          status: "sent" as const,
          summary: FAKE_EMAIL_BACKUP_SUMMARY,
        }),
      ),
    ),
    getProgress: vi.fn(() =>
      Promise.resolve({ stage: "idle" as const, processed: 0, total: 0 }),
    ),
    getLastResult: vi.fn(() =>
      Promise.resolve(emailBackupSucceeded(undefined)),
    ),
    getAutoBackup: vi.fn(() =>
      Promise.resolve(emailBackupSucceeded(DEFAULT_AUTO_BACKUP_STATUS)),
    ),
    saveAutoBackup: vi.fn((request: AutoBackupSaveRequest) =>
      Promise.resolve(emailBackupSucceeded(statusOfRequest(request))),
    ),
    ...overrides,
  };
}

/**
 * 让假桥读取设置时返回已保存过的设置, 再叠加其它覆盖项.
 * @param view 读取设置时返回的视图, 默认是已保存过的 QQ 邮箱设置.
 * @param overrides 其它要覆盖的方法.
 * @returns 可交给条目测试环境的邮箱备份桥覆盖项.
 */
export function savedEmailBackupOverrides(
  view: EmailBackupSettingsView = FAKE_SAVED_EMAIL_BACKUP_VIEW,
  overrides: Partial<EmailBackupBridge> = {},
): Partial<EmailBackupBridge> {
  return {
    getSettings: vi.fn(() => Promise.resolve(emailBackupSucceeded(view))),
    ...overrides,
  };
}

/**
 * 让假桥的某个方法失败, 用于测试失败路径.
 * @param reason 失败原因.
 * @returns 总是返回失败结果的间谍.
 */
export function failingEmailBackupWith(
  reason: EmailBackupFailureReason,
): () => Promise<ReturnType<typeof emailBackupFailed>> {
  return vi.fn(() => Promise.resolve(emailBackupFailed(reason)));
}
