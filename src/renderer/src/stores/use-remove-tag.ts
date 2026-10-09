import { useCallback } from "react";

import type { TagResult } from "@shared/tags/tag-result";

import { useEntryStore } from "./use-entry-store";
import { useTagStore } from "./use-tag-store";

/**
 * 取得删除标签的方法: 先经标签接口在主进程删除, 成功后从列表移除标签, 并让条目在内存里摘掉它.
 * @returns 删除方法.
 */
export function useRemoveTag(): (
  tagId: string,
) => Promise<TagResult<undefined>> {
  const remove = useTagStore((state) => state.remove);
  const releaseTag = useEntryStore((state) => state.releaseTag);
  return useCallback(
    async (tagId) => {
      const result = await remove(tagId);
      if (result.ok) {
        releaseTag(tagId);
      }
      return result;
    },
    [remove, releaseTag],
  );
}
