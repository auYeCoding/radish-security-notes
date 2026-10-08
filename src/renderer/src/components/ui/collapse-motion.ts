/**
 * 可折叠区域所处的状态: 展开, 或折叠.
 */
export type CollapseState = "expanded" | "collapsed";

/**
 * 可折叠盒子收放的方向: 沿宽度收放, 或沿高度收放.
 */
export type CollapseAxis = "width" | "height";

/**
 * 尺寸过渡: 宽度与高度在基础档内按动效曲线变化. 属性名 `extent` 在主题样式里登记,
 * 用于侧栏宽度和可折叠盒子的收放.
 */
export const COLLAPSE_EXTENT_TRANSITION =
  "transition-extent duration-(--motion-base) ease-(--motion-ease)";

/**
 * 空间过渡: 伸缩份额, 外边距与内边距在基础档内按动效曲线变化. 属性名 `flex-space`
 * 在主题样式里登记, 用于文字区的收放和入口行的占位.
 */
export const COLLAPSE_SPACE_TRANSITION =
  "transition-flex-space duration-(--motion-base) ease-(--motion-ease)";

/**
 * 淡入淡出过渡: 只过渡透明度, 取快档, 比尺寸过渡短, 折叠时文字在被挤窄前已经淡出.
 */
export const COLLAPSE_FADE_TRANSITION =
  "transition-opacity duration-(--motion-fast) ease-(--motion-ease)";

/**
 * 淡入淡出的两种状态: 展开时延迟快档退出档再淡入, 等宽度放出一些空间; 折叠时没有延迟,
 * 立即淡出.
 */
export const COLLAPSE_FADE_CLASSES: Readonly<Record<CollapseState, string>> = {
  expanded: "opacity-100 delay-(--motion-fast-exit)",
  collapsed: "opacity-0",
};

/**
 * 可折叠盒子外层的共同类名: 裁掉收起时溢出的内容, 并带尺寸过渡.
 */
export const COLLAPSE_BOX_BASE_CLASSES = `overflow-hidden ${COLLAPSE_EXTENT_TRANSITION}`;

/**
 * 可折叠盒子外层在两个方向, 两种状态下的尺寸类名: 展开取自动尺寸, 折叠取零.
 * 沿宽度收放的盒子是行内的伸缩子项, 不参与挤压.
 */
export const COLLAPSE_BOX_AXIS_CLASSES: Readonly<
  Record<CollapseAxis, Readonly<Record<CollapseState, string>>>
> = {
  width: { expanded: "w-auto shrink-0", collapsed: "w-0 shrink-0" },
  height: { expanded: "h-auto", collapsed: "h-0" },
};

/**
 * 行内文字区外层的共同类名: 伸缩基准为零, 靠伸缩份额占满或让出剩余宽度, 裁掉多出的文字,
 * 并带空间过渡.
 */
export const COLLAPSIBLE_TEXT_BASE_CLASSES = `min-w-0 basis-0 overflow-hidden ${COLLAPSE_SPACE_TRANSITION}`;

/**
 * 行内文字区外层在两种状态下的类名: 展开时占满剩余宽度并与图标隔开间距, 折叠时份额与
 * 间距都归零, 图标与文字这一组因此始终在行内居中.
 */
export const COLLAPSIBLE_TEXT_STATE_CLASSES: Readonly<
  Record<CollapseState, string>
> = {
  expanded: "grow ms-2",
  collapsed: "grow-0 ms-0",
};

/**
 * 入口行前后占位的共同类名: 用前后两个伪元素把切换按钮夹在中间, 前占位份额固定,
 * 后占位份额随状态过渡.
 */
export const TOGGLE_ROW_SPACER_CLASSES =
  "before:grow before:basis-0 after:basis-0 after:transition-flex-space after:duration-(--motion-base) after:ease-(--motion-ease)";

/**
 * 入口行后占位在两种状态下的份额: 展开时为零, 按钮靠结束侧; 折叠时与前占位相等, 按钮居中.
 */
export const TOGGLE_ROW_ALIGNMENT_CLASSES: Readonly<
  Record<CollapseState, string>
> = {
  expanded: "after:grow-0",
  collapsed: "after:grow",
};
