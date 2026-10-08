/**
 * 快档状态过渡: 悬停, 聚焦, 按下, 选中, 禁用等状态变化. 属性取 Tailwind 默认的
 * 颜色, 边框, 阴影, 透明度与位移集合, 时长与曲线取动效 token.
 */
export const FAST_STATE_TRANSITION =
  "transition duration-(--motion-fast) ease-(--motion-ease)";

/**
 * 基础档状态过渡: 用于开关轨道这类状态切换幅度较大的控件.
 */
export const BASE_STATE_TRANSITION =
  "transition duration-(--motion-base) ease-(--motion-ease)";

/**
 * 基础档位移过渡: 只过渡位移与缩放, 用于开关滑块.
 */
export const BASE_TRANSFORM_TRANSITION =
  "transition-transform duration-(--motion-base) ease-(--motion-ease)";

/**
 * 勾选与单选标记的出现与消失过渡: 淡入并由 90% 缩放到 100%, 消失时反向.
 * 起止样式由 Base UI 指示器的 starting 与 ending 数据属性提供.
 */
export const MARK_TRANSITION =
  "transition duration-(--motion-fast) ease-(--motion-ease) data-starting-style:scale-90 data-starting-style:opacity-0 data-ending-style:scale-90 data-ending-style:opacity-0";

/**
 * 快档淡入: 元素挂载时只做透明度由 0 到 1 的淡入, 不位移不缩放, 用于反馈提示, 批量按钮组与
 * 详情内容这类条件渲染出现的元素. 消失时直接卸载, 不做动画.
 */
export const FADE_IN_MOTION =
  "animate-in fade-in-0 duration-(--motion-fast) ease-(--motion-ease)";
