import type { MarkdownElementProps } from "./markdown-element-props";

/**
 * 代码块的外框: 等宽字体原样显示, 不做语法高亮, 过宽时横向滚动, 里面的行内代码样式被去掉.
 * @param props 组件属性.
 * @returns 代码块元素.
 */
export function MarkdownPreformatted(
  props: MarkdownElementProps<"pre">,
): React.JSX.Element {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs *:bg-transparent *:p-0">
      {props.children}
    </pre>
  );
}

/**
 * 行内代码.
 * @param props 组件属性.
 * @returns 行内代码元素.
 */
export function MarkdownCode(
  props: MarkdownElementProps<"code">,
): React.JSX.Element {
  return (
    <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs">
      {props.children}
    </code>
  );
}
