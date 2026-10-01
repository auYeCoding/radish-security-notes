import type { EntryBridge } from "@shared/entries/entry-bridge";
import { entryFailed, entrySucceeded } from "@shared/entries/entry-result";
import { toEntrySummary, type EntryDetail } from "@shared/entries/entry-types";
import { vi } from "vitest";

/**
 * 创建组件测试用的假条目桥: 条目存在内存里, 最新创建的在最前, 每个方法都是间谍.
 * @param initial 初始条目, 按最新创建在前排列.
 * @param overrides 覆盖假桥上的方法, 例如让复制失败.
 * @returns 假条目桥.
 */
export function createFakeEntryBridge(
  initial: readonly EntryDetail[] = [],
  overrides: Partial<EntryBridge> = {},
): EntryBridge {
  const details = [...initial];
  return {
    list: vi.fn(() =>
      Promise.resolve(entrySucceeded(details.map(toEntrySummary))),
    ),
    get: vi.fn((id: string) => {
      const found = details.find((detail) => detail.id === id);
      return Promise.resolve(
        found === undefined ? entryFailed("not-found") : entrySucceeded(found),
      );
    }),
    create: vi.fn((input) => {
      const detail: EntryDetail = {
        id: `created-${details.length + 1}`,
        ...input,
        name: input.name.trim(),
      };
      details.unshift(detail);
      return Promise.resolve(entrySucceeded(detail));
    }),
    copyField: vi.fn(() => Promise.resolve(entrySucceeded(undefined))),
    ...overrides,
  };
}
