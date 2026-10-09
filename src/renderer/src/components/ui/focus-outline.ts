/**
 * 非文本控件键盘聚焦时的轮廓: 宽 1px, 与控件隔 2px, 取聚焦色. 选中的勾选, 开关, 单选以及主色
 * 按钮的填充色与聚焦色相同, 边框变色看不出来, 所以用带间隔的外轮廓.
 */
export const FOCUS_OUTLINE =
  "focus-visible:outline-1 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * 破坏性变体键盘聚焦时的轮廓颜色: 加在 `FOCUS_OUTLINE` 之上, 把颜色换成破坏色 (对比度不低于
 * 3:1). 类名合并不处理同属性的冲突, 所以用重要性后缀压过基础类里的聚焦色.
 */
export const DESTRUCTIVE_FOCUS_OUTLINE_COLOR =
  "focus-visible:outline-destructive!";

/**
 * 铺满容器的控件键盘聚焦时的轮廓: 宽 1px, 向内缩 2px, 不会被外层裁掉.
 */
export const INSET_FOCUS_OUTLINE =
  "focus-visible:outline-1 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring";

/**
 * 控件放在字段卡片标签里时关掉自身的聚焦轮廓, 由卡片标签自己显示聚焦.
 */
export const FIELD_LABEL_FOCUS_OUTLINE_RESET =
  "group-has-[:focus-visible]/field-label:outline-0";
