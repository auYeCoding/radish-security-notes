import type { ExtraProps } from "react-markdown";

/**
 * 渲染 Markdown 时, 某个 HTML 标签的自定义组件收到的属性: 该标签的原生属性加上 react-markdown 额外
 * 传入的语法树节点. 组件只取需要的属性, 不把整组属性展开到页面元素上.
 */
export type MarkdownElementProps<
  Tag extends keyof React.JSX.IntrinsicElements,
> = React.JSX.IntrinsicElements[Tag] & ExtraProps;
