import type { MarkdownElementProps } from "./markdown-element-props";

/**
 * 表格, 过宽时在外层横向滚动.
 * @param props 组件属性.
 * @returns 表格元素.
 */
export function MarkdownTable(
  props: MarkdownElementProps<"table">,
): React.JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{props.children}</table>
    </div>
  );
}

/**
 * 表头单元格.
 * @param props 组件属性.
 * @returns 表头单元格元素.
 */
export function MarkdownTableHeaderCell(
  props: MarkdownElementProps<"th">,
): React.JSX.Element {
  return (
    <th
      align={props.align}
      className="border border-border bg-muted px-2 py-1 text-left font-medium"
    >
      {props.children}
    </th>
  );
}

/**
 * 表格单元格.
 * @param props 组件属性.
 * @returns 表格单元格元素.
 */
export function MarkdownTableCell(
  props: MarkdownElementProps<"td">,
): React.JSX.Element {
  return (
    <td align={props.align} className="border border-border px-2 py-1">
      {props.children}
    </td>
  );
}
