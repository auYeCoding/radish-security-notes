/**
 * 点击一行条目的意图: 选中它查看详情, 切换它的勾选, 或连选区间.
 */
export type EntryRowClickIntent = "select" | "toggle" | "range";

/**
 * 点击事件里与修饰键有关的部分.
 */
export interface RowClickModifiers {
  /**
   * 点击时是否按住 Ctrl.
   */
  readonly ctrlKey: boolean;
  /**
   * 点击时是否按住 Meta.
   */
  readonly metaKey: boolean;
  /**
   * 点击时是否按住 Shift.
   */
  readonly shiftKey: boolean;
}

/**
 * 按点击时按住的修饰键判断点击一行条目的意图: Ctrl 或 Meta 是切换勾选, Shift 是连选区间, 都没按
 * 住是选中查看详情; 同时按住 Ctrl 与 Shift 时按切换勾选处理.
 * @param modifiers 点击事件里与修饰键有关的部分.
 * @returns 点击的意图.
 */
export function intentOfRowClick(
  modifiers: RowClickModifiers,
): EntryRowClickIntent {
  if (modifiers.ctrlKey || modifiers.metaKey) {
    return "toggle";
  }
  return modifiers.shiftKey ? "range" : "select";
}
