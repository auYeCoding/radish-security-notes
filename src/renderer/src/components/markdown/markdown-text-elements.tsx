import { cn } from "@renderer/lib/class-names";

import type { MarkdownElementProps } from "./markdown-element-props";

/**
 * 段落.
 * @param props 组件属性.
 * @returns 段落元素.
 */
export function MarkdownParagraph(
  props: MarkdownElementProps<"p">,
): React.JSX.Element {
  return <p className="leading-relaxed">{props.children}</p>;
}

/**
 * 无序列表.
 * @param props 组件属性.
 * @returns 无序列表元素.
 */
export function MarkdownBulletList(
  props: MarkdownElementProps<"ul">,
): React.JSX.Element {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">{props.children}</ul>
  );
}

/**
 * 有序列表.
 * @param props 组件属性.
 * @returns 有序列表元素.
 */
export function MarkdownOrderedList(
  props: MarkdownElementProps<"ol">,
): React.JSX.Element {
  return (
    <ol className="flex list-decimal flex-col gap-1 pl-5">{props.children}</ol>
  );
}

/**
 * 列表项, 任务列表的列表项不显示圆点, 由前面的复选框代替.
 * @param props 组件属性.
 * @returns 列表项元素.
 */
export function MarkdownListItem(
  props: MarkdownElementProps<"li">,
): React.JSX.Element {
  const isTaskItem = props.className?.includes("task-list-item") === true;
  return (
    <li
      className={cn("marker:text-muted-foreground", isTaskItem && "list-none")}
    >
      {props.children}
    </li>
  );
}

/**
 * 引用块.
 * @param props 组件属性.
 * @returns 引用块元素.
 */
export function MarkdownBlockquote(
  props: MarkdownElementProps<"blockquote">,
): React.JSX.Element {
  return (
    <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">
      {props.children}
    </blockquote>
  );
}

/**
 * 分隔线.
 * @returns 分隔线元素.
 */
export function MarkdownRule(): React.JSX.Element {
  return <hr className="border-border" />;
}
