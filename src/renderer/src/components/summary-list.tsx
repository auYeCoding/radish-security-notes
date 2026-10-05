/**
 * 概要里的一行: 名称与值.
 */
export interface SummaryRow {
  /**
   * 这一行的名称.
   */
  readonly label: string;
  /**
   * 这一行的值, 个数或一段说明文字.
   */
  readonly value: number | string;
}

/**
 * 概要列表的属性.
 */
interface SummaryListProps {
  /**
   * 要列出的行.
   */
  readonly rows: readonly SummaryRow[];
}

/**
 * 概要列表: 每行左边是名称, 右边是值. 导入预览与导入结果, 导出确认与导出结果共用.
 * @param props 组件属性.
 * @returns 概要列表元素.
 */
export function SummaryList(props: SummaryListProps): React.JSX.Element {
  return (
    <dl className="flex flex-col gap-1 text-sm">
      {props.rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4"
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
