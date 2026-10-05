import { vi } from "vitest";

import type { ExportBridge } from "@shared/export/export-bridge";
import {
  exportFailed,
  exportSucceeded,
  type ExportFailureReason,
} from "@shared/export/export-result";
import type {
  ExportScopeSummary,
  ExportSummary,
} from "@shared/export/export-types";

/**
 * 假导出桥里统计范围返回的概况: 8 条条目, 3 个附件共 3 KiB, 设了主密码.
 */
export const FAKE_EXPORT_SCOPE_SUMMARY: ExportScopeSummary = {
  entryCount: 8,
  attachmentCount: 3,
  attachmentBytes: 3072,
  hasMasterPassword: true,
};

/**
 * 假导出桥里导出成功返回的摘要: 本应用格式, 8 条条目, 3 个附件, 未加密, 含保密字段.
 */
export const FAKE_EXPORT_SUMMARY: ExportSummary = {
  format: "native",
  entryCount: 8,
  attachmentCount: 3,
  fileSizeBytes: 20480,
  includesAttachments: true,
  includesSecrets: true,
  isEncrypted: false,
  losses: [],
};

/**
 * 创建组件测试用的假导出桥: 每个方法都是间谍, 统计范围返回固定的概况, 导出返回固定的摘要,
 * 进度是空闲, 其余操作成功.
 * @param overrides 覆盖假桥上的方法, 例如让导出失败.
 * @returns 假导出桥.
 */
export function createFakeExportBridge(
  overrides: Partial<ExportBridge> = {},
): ExportBridge {
  return {
    describeScope: vi.fn(() =>
      Promise.resolve(exportSucceeded(FAKE_EXPORT_SCOPE_SUMMARY)),
    ),
    run: vi.fn(() =>
      Promise.resolve(
        exportSucceeded({
          status: "saved" as const,
          summary: FAKE_EXPORT_SUMMARY,
        }),
      ),
    ),
    getProgress: vi.fn(() =>
      Promise.resolve({ stage: "idle" as const, processed: 0, total: 0 }),
    ),
    cancel: vi.fn(() => Promise.resolve()),
    revealFile: vi.fn(() => Promise.resolve(exportSucceeded(undefined))),
    ...overrides,
  };
}

/**
 * 让假桥的某个方法失败, 用于测试失败路径.
 * @param reason 失败原因.
 * @returns 总是返回失败结果的间谍.
 */
export function failingExportWith(
  reason: ExportFailureReason,
): () => Promise<ReturnType<typeof exportFailed>> {
  return vi.fn(() => Promise.resolve(exportFailed(reason)));
}
