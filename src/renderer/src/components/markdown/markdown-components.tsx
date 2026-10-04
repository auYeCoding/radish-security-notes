import type { Components } from "react-markdown";

import { MarkdownCode, MarkdownPreformatted } from "./markdown-code-elements";
import type { MarkdownElementProps } from "./markdown-element-props";
import { MarkdownImage } from "./markdown-image";
import { MarkdownLink } from "./markdown-link";
import {
  MarkdownTable,
  MarkdownTableCell,
  MarkdownTableHeaderCell,
} from "./markdown-table-elements";
import { MarkdownTaskCheckbox } from "./markdown-task-checkbox";
import {
  MarkdownBlockquote,
  MarkdownBulletList,
  MarkdownListItem,
  MarkdownOrderedList,
  MarkdownParagraph,
  MarkdownRule,
} from "./markdown-text-elements";

/**
 * Markdown 里的标题标签.
 */
type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/**
 * 各级标题的样式, 级别越低字号越小, 最末一级用次要文字色.
 */
const HEADING_CLASS_NAMES: Readonly<Record<HeadingTag, string>> = {
  h1: "text-lg font-semibold",
  h2: "text-base font-semibold",
  h3: "text-sm font-semibold",
  h4: "text-sm font-medium",
  h5: "text-sm font-medium",
  h6: "text-sm font-medium text-muted-foreground",
};

/**
 * 创建某一级标题的自定义组件.
 * @param Tag 标题标签.
 * @returns 渲染该级标题的组件.
 */
function createHeading(
  Tag: HeadingTag,
): (props: MarkdownElementProps<HeadingTag>) => React.JSX.Element {
  return function MarkdownHeading(
    props: MarkdownElementProps<HeadingTag>,
  ): React.JSX.Element {
    return <Tag className={HEADING_CLASS_NAMES[Tag]}>{props.children}</Tag>;
  };
}

/**
 * Markdown 渲染用的元素映射: 每个元素都由自己的组件渲染, 样式取自设计 token; 链接, 图片与任务
 * 复选框由受限的组件接管, 页面里不会出现真正的链接元素, 图片元素与可点击的输入.
 */
export const MARKDOWN_COMPONENTS: Components = {
  a: MarkdownLink,
  blockquote: MarkdownBlockquote,
  code: MarkdownCode,
  h1: createHeading("h1"),
  h2: createHeading("h2"),
  h3: createHeading("h3"),
  h4: createHeading("h4"),
  h5: createHeading("h5"),
  h6: createHeading("h6"),
  hr: MarkdownRule,
  img: MarkdownImage,
  input: MarkdownTaskCheckbox,
  li: MarkdownListItem,
  ol: MarkdownOrderedList,
  p: MarkdownParagraph,
  pre: MarkdownPreformatted,
  table: MarkdownTable,
  td: MarkdownTableCell,
  th: MarkdownTableHeaderCell,
  ul: MarkdownBulletList,
};
