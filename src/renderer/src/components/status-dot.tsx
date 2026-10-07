import { cn } from "@renderer/lib/class-names";

/**
 * 状态圆点的属性.
 */
interface StatusDotProps {
  /**
   * 追加的类名, 例如调整位置.
   */
  readonly className?: string;
}

/**
 * 状态圆点: 一个取危险色 token 的实心小圆点, 只是视觉标记, 状态的文字说明由所在控件的无障碍名称给出.
 * 控件只剩图标, 放不下状态文字时用它叠在图标角上.
 * @param props 组件属性.
 * @returns 圆点元素.
 */
export function StatusDot(props: StatusDotProps): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-slot="status-dot"
      className={cn(
        "inline-block size-2 rounded-full bg-destructive",
        props.className,
      )}
    />
  );
}
