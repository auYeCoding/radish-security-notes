import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ExternalLinkConfirmDialog } from "./external-link-confirm-dialog";
import { MARKDOWN_COMPONENTS } from "./markdown-components";
import { MarkdownLinkContext } from "./markdown-link-context";
import {
  useExternalLinkRequest,
  type OpenExternalLink,
} from "./use-external-link-request";

/**
 * Markdown 视图的属性.
 */
interface MarkdownViewProps {
  /**
   * Markdown 原文.
   */
  readonly source: string;
  /**
   * 请主进程打开外部链接的函数, 用户在确认框里确认后才调用.
   */
  readonly openExternalLink: OpenExternalLink;
}

/**
 * Markdown 渲染用的 remark 插件: 在标准 CommonMark 之外加表格, 任务列表, 删除线, 脚注与裸网址自动
 * 成链接.
 */
const REMARK_PLUGINS = [remarkGfm];

/**
 * 把 Markdown 原文渲染成界面: 渲染结果由 React 元素构成, 不直接注入 HTML; 原文里的 HTML 不解析, 按
 * 文本原样显示; 链接只有 http, https, mailto 能点, 点击后经确认框确认才交给系统打开; 图片一律不加载.
 * @param props 组件属性.
 * @returns Markdown 视图元素.
 */
export function MarkdownView(props: MarkdownViewProps): React.JSX.Element {
  const linkRequest = useExternalLinkRequest(props.openExternalLink);
  return (
    <MarkdownLinkContext.Provider value={linkRequest.request}>
      <div className="flex flex-col gap-2 break-words">
        <Markdown
          remarkPlugins={REMARK_PLUGINS}
          components={MARKDOWN_COMPONENTS}
        >
          {props.source}
        </Markdown>
      </div>
      {linkRequest.pendingUrl !== undefined && (
        <ExternalLinkConfirmDialog
          url={linkRequest.pendingUrl}
          isOpening={linkRequest.isOpening}
          hasFailed={linkRequest.hasFailed}
          onConfirm={() => void linkRequest.confirm()}
          onClose={linkRequest.cancel}
        />
      )}
    </MarkdownLinkContext.Provider>
  );
}
