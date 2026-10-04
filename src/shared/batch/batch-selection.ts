/**
 * 全选框的状态: 当前可见的条目一个都没选中, 部分选中, 或全部选中.
 */
export type SelectAllState = "none" | "some" | "all";

/**
 * 没有勾选任何条目时用的空集合, 引用固定, 方便比较与复用.
 */
export const NO_CHECKED_IDS: ReadonlySet<string> = new Set<string>();

/**
 * 切换一个条目的勾选状态: 已勾选则取消, 否则加入.
 * @param checked 已勾选的条目编号.
 * @param id 被切换的条目编号.
 * @returns 新的已勾选集合.
 */
export function toggleChecked(
  checked: ReadonlySet<string>,
  id: string,
): ReadonlySet<string> {
  const next = new Set(checked);
  if (!next.delete(id)) {
    next.add(id);
  }
  return next;
}

/**
 * 勾选锚点与目标之间的全部可见条目 (含两端), 并入已有的勾选. 没有锚点, 或锚点不在可见列表里时只
 * 勾选目标; 目标不在可见列表里时原样返回.
 * @param checked 已勾选的条目编号.
 * @param visibleIds 当前可见的条目编号, 按显示顺序排列.
 * @param anchorId 区间的起点, 是最近一次勾选或切换的条目, 没有时为 undefined.
 * @param targetId 区间的终点, 是被点击的条目.
 * @returns 新的已勾选集合.
 */
export function checkRange(
  checked: ReadonlySet<string>,
  visibleIds: readonly string[],
  anchorId: string | undefined,
  targetId: string,
): ReadonlySet<string> {
  const targetIndex = visibleIds.indexOf(targetId);
  if (targetIndex < 0) {
    return checked;
  }
  const anchorIndex =
    anchorId === undefined ? targetIndex : visibleIds.indexOf(anchorId);
  const startIndex = anchorIndex < 0 ? targetIndex : anchorIndex;
  const first = Math.min(startIndex, targetIndex);
  const last = Math.max(startIndex, targetIndex);
  return new Set([...checked, ...visibleIds.slice(first, last + 1)]);
}

/**
 * 勾选当前可见的全部条目.
 * @param checked 已勾选的条目编号.
 * @param visibleIds 当前可见的条目编号.
 * @returns 新的已勾选集合.
 */
export function checkAllVisible(
  checked: ReadonlySet<string>,
  visibleIds: readonly string[],
): ReadonlySet<string> {
  return new Set([...checked, ...visibleIds]);
}

/**
 * 取消勾选当前可见的全部条目.
 * @param checked 已勾选的条目编号.
 * @param visibleIds 当前可见的条目编号.
 * @returns 新的已勾选集合.
 */
export function uncheckAllVisible(
  checked: ReadonlySet<string>,
  visibleIds: readonly string[],
): ReadonlySet<string> {
  const visible = new Set(visibleIds);
  return new Set([...checked].filter((id) => !visible.has(id)));
}

/**
 * 在当前可见的条目里反选: 原来没勾选的变成勾选, 原来勾选的变成不勾选. 不可见的条目不参与, 也不保留.
 * @param checked 已勾选的条目编号.
 * @param visibleIds 当前可见的条目编号.
 * @returns 新的已勾选集合.
 */
export function invertChecked(
  checked: ReadonlySet<string>,
  visibleIds: readonly string[],
): ReadonlySet<string> {
  return new Set(visibleIds.filter((id) => !checked.has(id)));
}

/**
 * 只保留仍可见的已勾选条目, 其余取消勾选. 没有需要取消的条目时原样返回同一个集合, 让订阅者
 * 不必重新渲染.
 * @param checked 已勾选的条目编号.
 * @param visibleIds 当前可见的条目编号.
 * @returns 仍可见的已勾选集合.
 */
export function retainVisibleChecked(
  checked: ReadonlySet<string>,
  visibleIds: readonly string[],
): ReadonlySet<string> {
  const visible = new Set(visibleIds);
  const kept = [...checked].filter((id) => visible.has(id));
  return kept.length === checked.size ? checked : new Set(kept);
}

/**
 * 取出当前可见且已勾选的条目编号, 按显示顺序排列.
 * @param checked 已勾选的条目编号.
 * @param visibleIds 当前可见的条目编号, 按显示顺序排列.
 * @returns 可见且已勾选的条目编号.
 */
export function checkedVisibleIds(
  checked: ReadonlySet<string>,
  visibleIds: readonly string[],
): readonly string[] {
  return visibleIds.filter((id) => checked.has(id));
}

/**
 * 算出全选框的状态.
 * @param checked 已勾选的条目编号.
 * @param visibleIds 当前可见的条目编号.
 * @returns 可见条目一个都没勾选时为 none, 全部勾选时为 all, 否则为 some.
 */
export function selectAllStateOf(
  checked: ReadonlySet<string>,
  visibleIds: readonly string[],
): SelectAllState {
  const count = checkedVisibleIds(checked, visibleIds).length;
  if (count === 0) {
    return "none";
  }
  return count === visibleIds.length ? "all" : "some";
}
