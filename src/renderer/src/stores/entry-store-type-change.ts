import { selectedIdOf } from "./entry-state";
import { selectEntry, type EntryStoreAccess } from "./entry-store-actions";
import { refreshEntries } from "./entry-store-refresh";
import { runEntrySearch } from "./entry-store-search";

/**
 * 自定义类型被修改或删除之后让条目一侧跟上: 重新读取全部条目的摘要 (列表摘要的账号可能变了),
 * 选中的条目重新读取详情 (类型定义或条目类型变了), 搜索关键字不为空时重新搜索 (可搜的字段变了).
 * 每一步失败时保持原样.
 * @param access store 动作能用到的东西.
 * @returns 全部读取完成后兑现.
 */
export async function reloadAfterTypeChange(
  access: EntryStoreAccess,
): Promise<void> {
  await refreshEntries(access);
  const selectedId = selectedIdOf(access.get().selection);
  if (selectedId !== undefined) {
    await selectEntry(access, selectedId);
  }
  await runEntrySearch(access);
}
