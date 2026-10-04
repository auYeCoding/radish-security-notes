import { createContext } from "react";

/**
 * 请求打开一个外部链接的函数, 由 Markdown 视图提供, 点击链接时调用, 真正打开之前先由用户确认.
 */
export type RequestExternalLink = (url: string) => void;

/**
 * Markdown 里的链接用来请求打开外部链接的上下文, 没有 Provider 时点击不做任何事.
 */
export const MarkdownLinkContext = createContext<RequestExternalLink>(
  () => undefined,
);
