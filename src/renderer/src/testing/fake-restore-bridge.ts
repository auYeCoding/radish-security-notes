import { vi } from "vitest";

import type { RestoreBridge } from "@shared/restore/restore-bridge";
import type { RestoreProblem } from "@shared/restore/restore-problem";
import {
  restoreFailed,
  restoreSucceeded,
  type RestoreFailureReason,
  type RestoreResult,
} from "@shared/restore/restore-result";
import type {
  RestoreChooseOutcome,
  RestoreOutcome,
  RestorePreview,
  RestoreVaultState,
} from "@shared/restore/restore-types";

/**
 * 假恢复桥里保险库是空的时给出的现有内容.
 */
export const FAKE_EMPTY_RESTORE_VAULT: RestoreVaultState = {
  isEmpty: true,
  entryCount: 0,
  attachmentCount: 0,
  folderCount: 0,
  tagCount: 0,
  customTypeCount: 0,
};

/**
 * 保险库里已有内容时给出的现有内容: 12 个条目, 4 个附件, 3 个文件夹, 5 个标签, 2 个自定义类型.
 */
export const FAKE_FILLED_RESTORE_VAULT: RestoreVaultState = {
  isEmpty: false,
  entryCount: 12,
  attachmentCount: 4,
  folderCount: 3,
  tagCount: 5,
  customTypeCount: 2,
};

/**
 * 假恢复桥里选择文件返回的预览: 明文备份, 8 个条目, 2 个文件夹, 3 个标签, 1 个自定义类型, 3 个附件共
 * 3 KiB, 含保密字段与附件内容, 保险库是空的, 没有设主密码. 备份时间不带时区, 按本机时间显示, 测试
 * 的显示结果因此与时区无关.
 */
export const FAKE_RESTORE_PREVIEW: RestorePreview = {
  createdAt: "2026-10-05T12:30:00",
  isEncrypted: false,
  entryCount: 8,
  folderCount: 2,
  tagCount: 3,
  customTypeCount: 1,
  attachmentCount: 3,
  attachmentBytes: 3072,
  includesSecrets: true,
  includesAttachments: true,
  vault: FAKE_EMPTY_RESTORE_VAULT,
  requiresMasterPassword: false,
};

/**
 * 假恢复桥里确认恢复返回的概况: 恢复 8 个条目, 2 个文件夹, 3 个标签, 1 个自定义类型, 3 个附件,
 * 没有替换原有数据.
 */
export const FAKE_RESTORE_OUTCOME: RestoreOutcome = {
  entryCount: 8,
  folderCount: 2,
  tagCount: 3,
  customTypeCount: 1,
  attachmentCount: 3,
  replacedExistingData: false,
};

/**
 * 创建组件测试用的假恢复桥: 每个方法都是间谍, 选择文件与提交口令返回固定的预览, 确认恢复返回固定的
 * 概况, 进度是空闲, 放弃成功.
 * @param overrides 覆盖假桥上的方法, 例如让选择文件失败.
 * @returns 假恢复桥.
 */
export function createFakeRestoreBridge(
  overrides: Partial<RestoreBridge> = {},
): RestoreBridge {
  return {
    chooseFile: vi.fn(() =>
      Promise.resolve(
        restoreSucceeded({
          status: "ready" as const,
          preview: FAKE_RESTORE_PREVIEW,
        }),
      ),
    ),
    submitPassphrase: vi.fn(() =>
      Promise.resolve(
        restoreSucceeded({
          status: "ready" as const,
          preview: FAKE_RESTORE_PREVIEW,
        }),
      ),
    ),
    run: vi.fn(() => Promise.resolve(restoreSucceeded(FAKE_RESTORE_OUTCOME))),
    getProgress: vi.fn(() =>
      Promise.resolve({ stage: "idle" as const, processed: 0, total: 0 }),
    ),
    cancel: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

/**
 * 让假桥的选择文件返回已就绪的备份, 预览在固定预览的基础上按需改动.
 * @param changes 要改动的预览字段, 例如保险库里已有内容或需要主密码.
 * @returns 返回已就绪结果的间谍.
 */
export function readyRestoreWith(
  changes: Partial<RestorePreview>,
): () => Promise<RestoreResult<RestoreChooseOutcome>> {
  return vi.fn(() =>
    Promise.resolve(
      restoreSucceeded({
        status: "ready" as const,
        preview: { ...FAKE_RESTORE_PREVIEW, ...changes },
      }),
    ),
  );
}

/**
 * 让假桥的选择文件返回需要口令的结果.
 * @param fileSizeBytes 文件的字节数.
 * @returns 返回需要口令结果的间谍.
 */
export function needsPassphraseWith(
  fileSizeBytes: number,
): () => Promise<RestoreResult<RestoreChooseOutcome>> {
  return vi.fn(() =>
    Promise.resolve(
      restoreSucceeded({
        status: "needs-passphrase" as const,
        fileSizeBytes,
      }),
    ),
  );
}

/**
 * 让假桥的某个方法失败, 用于测试失败路径.
 * @param reason 失败原因.
 * @param problem 第一个问题, 与具体问题无关时省略.
 * @returns 总是返回失败结果的间谍.
 */
export function failingRestoreWith(
  reason: RestoreFailureReason,
  problem?: RestoreProblem,
): () => Promise<ReturnType<typeof restoreFailed>> {
  return vi.fn(() => Promise.resolve(restoreFailed(reason, problem)));
}
