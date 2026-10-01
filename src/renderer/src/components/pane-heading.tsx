import type { ReactNode } from "react";

/**
 * 窗格标题的属性.
 */
interface PaneHeadingProps {
  /**
   * 标题文字.
   */
  readonly title: string;
  /**
   * 标题右侧的辅助内容, 例如条目计数.
   */
  readonly trailing?: ReactNode;
}

/**
 * 窗格或分区的标题行: 左侧是标题, 右侧可放辅助内容.
 * @param props 组件属性.
 * @returns 标题行元素.
 */
export function PaneHeading(props: PaneHeadingProps): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
      <h2 className="text-sm font-semibold">{props.title}</h2>
      {props.trailing === undefined ? null : (
        <span className="text-xs text-muted-foreground">{props.trailing}</span>
      )}
    </div>
  );
}
