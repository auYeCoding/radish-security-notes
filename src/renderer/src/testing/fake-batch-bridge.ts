import type { BatchBridge } from "@shared/batch/batch-bridge";
import { batchFailed, batchSucceeded } from "@shared/batch/batch-result";
import type { EntryTagAssignment } from "@shared/batch/entry-tag-assignment";
import { appendTagId, wouldExceedTagLimit } from "@shared/batch/tag-append";
import type { EntryDetail } from "@shared/entries/entry-types";
import { tagIdsOrOmitted, withoutTagId } from "@shared/tags/tag-filter";
import { vi } from "vitest";

/**
 * 判断给定的条目编号是否都对应假桥里存在的条目.
 * @param details 假桥里的条目数据.
 * @param entryIds 条目编号.
 * @returns 全部存在时返回 true.
 */
function areAllPresent(
  details: readonly EntryDetail[],
  entryIds: readonly string[],
): boolean {
  return entryIds.every((id) => details.some((detail) => detail.id === id));
}

/**
 * 在假桥的条目数据里对一批条目的标签做同一种改动, 与主进程的批量服务一样整批生效或整批不生效.
 * @param details 假桥里的条目数据, 会被原地改写.
 * @param entryIds 条目编号.
 * @param isBlocked 判断某个条目的标签改动是否被拦下.
 * @param apply 算出改动后的标签.
 * @returns 每个条目现在带的标签, 或失败结果.
 */
function changeFakeTags(
  details: EntryDetail[],
  entryIds: readonly string[],
  isBlocked: (own: readonly string[]) => boolean,
  apply: (own: readonly string[]) => readonly string[],
): ReturnType<BatchBridge["addTag"]> {
  if (entryIds.length === 0 || !areAllPresent(details, entryIds)) {
    return Promise.resolve(batchFailed("not-found"));
  }
  const owns = entryIds.map(
    (id) => details.find((detail) => detail.id === id)?.tagIds ?? [],
  );
  if (owns.some(isBlocked)) {
    return Promise.resolve(batchFailed("tag-limit-exceeded"));
  }
  const assignments: EntryTagAssignment[] = entryIds.map((entryId, index) => ({
    entryId,
    tagIds: apply(owns[index] ?? []),
  }));
  assignments.forEach((assignment) => {
    const index = details.findIndex(
      (detail) => detail.id === assignment.entryId,
    );
    const detail = details[index];
    if (detail !== undefined) {
      details[index] = {
        ...detail,
        tagIds: tagIdsOrOmitted(assignment.tagIds),
      };
    }
  });
  return Promise.resolve(batchSucceeded(assignments));
}

/**
 * 创建组件测试用的假批量桥: 直接读写与假条目桥共享的条目数据, 行为与主进程的批量服务一致 (条目
 * 不存在, 标签超过上限时整批失败), 每个方法都是间谍. 假桥不核对文件夹与标签是否存在, 需要时用
 * `overrides` 覆盖.
 * @param details 与假条目桥共享的条目数据, 会被原地改写.
 * @param overrides 覆盖假桥上的方法, 例如让批量删除失败.
 * @returns 假批量桥.
 */
export function createFakeBatchBridge(
  details: EntryDetail[],
  overrides: Partial<BatchBridge> = {},
): BatchBridge {
  return {
    removeEntries: vi.fn((entryIds: readonly string[]) => {
      if (entryIds.length === 0 || !areAllPresent(details, entryIds)) {
        return Promise.resolve(batchFailed("not-found"));
      }
      const removed = new Set(entryIds);
      details.splice(
        0,
        details.length,
        ...details.filter((detail) => !removed.has(detail.id)),
      );
      return Promise.resolve(batchSucceeded(undefined));
    }),
    moveEntries: vi.fn(
      (entryIds: readonly string[], folderId: string | undefined) => {
        if (entryIds.length === 0 || !areAllPresent(details, entryIds)) {
          return Promise.resolve(batchFailed("not-found"));
        }
        const moved = new Set(entryIds);
        details.forEach((detail, index) => {
          if (moved.has(detail.id)) {
            details[index] = { ...detail, folderId };
          }
        });
        return Promise.resolve(batchSucceeded(undefined));
      },
    ),
    addTag: vi.fn((entryIds: readonly string[], tagId: string) =>
      changeFakeTags(
        details,
        entryIds,
        (own) => wouldExceedTagLimit(own, tagId),
        (own) => appendTagId(own, tagId),
      ),
    ),
    removeTag: vi.fn((entryIds: readonly string[], tagId: string) =>
      changeFakeTags(
        details,
        entryIds,
        () => false,
        (own) => withoutTagId(own, tagId),
      ),
    ),
    ...overrides,
  };
}
