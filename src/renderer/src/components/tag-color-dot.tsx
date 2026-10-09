import type { TagColorKey } from "@shared/tags/tag-colors";

import { TAG_COLOR_CLASS_NAMES } from "@renderer/components/tag-color-classes";
import { cn } from "@renderer/lib/class-names";

/**
 * 标签颜色点的属性.
 */
interface TagColorDotProps {
  /**
   * 标签在调色板里的颜色键.
   */
  readonly color: TagColorKey;
  /**
   * 追加的类名, 例如调整尺寸.
   */
  readonly className?: string;
}

/**
 * 标签颜色点: 一个实心小圆点, 只是颜色的装饰, 颜色的名称由相邻的文字或无障碍标签给出. 设置里的
 * 标签列表, 徽章, 调色板与表单下拉里的标签共用.
 * @param props 组件属性.
 * @returns 颜色点元素.
 */
export function TagColorDot(props: TagColorDotProps): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        TAG_COLOR_CLASS_NAMES[props.color],
        props.className,
      )}
    />
  );
}
