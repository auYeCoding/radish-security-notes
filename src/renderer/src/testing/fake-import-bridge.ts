import { vi } from "vitest";

import type { ImportBridge } from "@shared/import/import-bridge";
import { importFailed, importSucceeded } from "@shared/import/import-result";
import type { ImportOutcome, ImportPreview } from "@shared/import/import-types";

/**
 * 假导入桥里选择文件返回的预览: 4 个条目, 3 个能导入, 有重复, 要新建文件夹.
 */
export const FAKE_IMPORT_PREVIEW: ImportPreview = {
  sourceKey: "bitwardenJson",
  totalEntryCount: 4,
  importableEntryCount: 3,
  skippedEntryCount: 1,
  typeCounts: [
    { typeKey: "login", count: 2 },
    { typeKey: "secureNote", count: 1 },
  ],
  newFolderCount: 1,
  newTagCount: 0,
  duplicateCount: 1,
  notImportedCount: 2,
};

/**
 * 假导入桥里确认导入返回的概况: 导入 3 个条目, 清单里有一个整条跳过的条目与一个字段.
 */
export const FAKE_IMPORT_OUTCOME: ImportOutcome = {
  importedCount: 3,
  skippedDuplicateCount: 0,
  skippedEntryCount: 1,
  createdFolderCount: 1,
  createdTagCount: 0,
  notImported: [
    { scope: "entry", name: "护照", reason: "type-unsupported" },
    {
      scope: "entry",
      name: "示例网站",
      fieldName: "TOTP",
      reason: "totp-invalid",
    },
  ],
};

/**
 * 创建组件测试用的假导入桥: 每个方法都是间谍, 选择文件返回固定的预览, 确认导入返回固定的概况,
 * 进度是空闲, 其余操作成功.
 * @param overrides 覆盖假桥上的方法, 例如让选择文件失败.
 * @returns 假导入桥.
 */
export function createFakeImportBridge(
  overrides: Partial<ImportBridge> = {},
): ImportBridge {
  return {
    chooseFile: vi.fn(() =>
      Promise.resolve(
        importSucceeded({
          status: "ready" as const,
          preview: FAKE_IMPORT_PREVIEW,
        }),
      ),
    ),
    run: vi.fn(() => Promise.resolve(importSucceeded(FAKE_IMPORT_OUTCOME))),
    getProgress: vi.fn(() =>
      Promise.resolve({ stage: "idle" as const, processed: 0, total: 0 }),
    ),
    cancel: vi.fn(() => Promise.resolve()),
    saveReport: vi.fn(() =>
      Promise.resolve(importSucceeded({ status: "saved" as const })),
    ),
    revealFile: vi.fn(() => Promise.resolve(importSucceeded(undefined))),
    ...overrides,
  };
}

/**
 * 让假桥的某个方法失败, 用于测试失败路径.
 * @param reason 失败原因.
 * @param line 出错的行号, 与具体行无关时省略.
 * @returns 总是返回失败结果的间谍.
 */
export function failingImportWith(
  reason: Parameters<typeof importFailed>[0],
  line?: number,
): () => Promise<ReturnType<typeof importFailed>> {
  return vi.fn(() => Promise.resolve(importFailed(reason, line)));
}
