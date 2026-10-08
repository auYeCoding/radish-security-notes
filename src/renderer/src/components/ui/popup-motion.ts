/**
 * 遮罩的进入与退出动画: 基础档淡入, 基础退出档淡出.
 */
export const OVERLAY_MOTION =
  "ease-(--motion-ease) data-open:duration-(--motion-base) data-closed:duration-(--motion-base-exit) data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0";

/**
 * 对话框与确认框面板的进入与退出动画: 居中淡入并由 95% 缩放到 100%, 基础档进入,
 * 基础退出档退出.
 */
export const MODAL_POPUP_MOTION =
  "ease-(--motion-ease) data-open:duration-(--motion-base) data-closed:duration-(--motion-base-exit) data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

/**
 * 锚点浮层 (菜单, 选择框, 组合框, 悬停提示) 的进入与退出动画: 从触发点淡入并由
 * 95% 缩放到 100%, 不滑入, 快档进入, 快档退出档退出. 缩放原点由组件自身的
 * `origin-(--transform-origin)` 提供.
 */
export const ANCHORED_POPUP_MOTION =
  "ease-(--motion-ease) data-open:duration-(--motion-fast) data-closed:duration-(--motion-fast-exit) data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";
