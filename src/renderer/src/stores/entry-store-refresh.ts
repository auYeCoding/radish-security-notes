import { selectedIdOf } from "./entry-state";
import type { EntryStoreAccess } from "./entry-store-actions";

/**
 * 重新读取全部条目的摘要, 不改读取状态, 列表不会闪成空白. 批量操作发现有条目已不存在时用它
 * 让界面与数据库重新一致; 详情里的条目已不存在时回到没有选中的状态. 读取失败或接口抛出错误时
 * 保持原样.
 * @param access store 动作能用到的东西.
 * @returns 读取完成后兑现.
 */
export async function refreshEntries(access: EntryStoreAccess): Promise<void> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.list();
    if (!result.ok) {
      return;
    }
    const selectedId = selectedIdOf(get().selection);
    const isSelectionLost =
      selectedId !== undefined &&
      !result.value.some((entry) => entry.id === selectedId);
    set(
      isSelectionLost
        ? { entries: result.value, selection: { status: "none" } }
        : { entries: result.value },
    );
  } catch {
    return;
  }
}
