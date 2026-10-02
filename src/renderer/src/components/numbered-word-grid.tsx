import type { ReactNode } from "react";

/**
 * 带序号的词网格的属性.
 */
interface NumberedWordGridProps {
  /**
   * 网格的无障碍名称.
   */
  readonly label: string;
  /**
   * 词的个数.
   */
  readonly count: number;
  /**
   * 渲染某个序号 (从 1 起) 的格子内容, 展示用文本, 输入用输入框.
   */
  readonly renderCell: (position: number) => ReactNode;
}

/**
 * 带序号的词网格: 屏幕与打印都固定 4 列, 序号按行从左到右递增. 主窗口有最小宽度,
 * 保证 4 列放得下. 恢复词的展示, 打印版式与输入共用同一套布局.
 * @param props 组件属性.
 * @returns 网格元素.
 */
export function NumberedWordGrid(
  props: NumberedWordGridProps,
): React.JSX.Element {
  const positions = Array.from(
    { length: props.count },
    (_, index) => index + 1,
  );
  return (
    <ol aria-label={props.label} className="grid grid-cols-4 gap-x-6 gap-y-3">
      {positions.map((position) => (
        <li key={position} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-6 shrink-0 text-end text-xs text-muted-foreground tabular-nums"
          >
            {position}.
          </span>
          {props.renderCell(position)}
        </li>
      ))}
    </ol>
  );
}
