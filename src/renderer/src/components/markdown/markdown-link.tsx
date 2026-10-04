import { useContext } from "react";

import { isAllowedExternalLink } from "@shared/links/external-link-policy";

import { Button } from "@renderer/components/ui/button";

import type { MarkdownElementProps } from "./markdown-element-props";
import { MarkdownLinkContext } from "./markdown-link-context";

/**
 * Markdown 里的链接: 地址符合外部链接策略 (http, https, mailto) 时显示成链接样式的按钮, 页面里没有
 * 真正的链接元素, 点击只请求打开, 由确认框确认后才交给系统; 其它地址 (脚本, 文件, 数据, 自定义协议,
 * 相对路径, 锚点) 只显示链接文字, 不能点.
 * @param props 组件属性.
 * @returns 链接按钮, 或普通文字元素.
 */
export function MarkdownLink(
  props: MarkdownElementProps<"a">,
): React.JSX.Element {
  const requestOpen = useContext(MarkdownLinkContext);
  const { href } = props;
  if (href === undefined || !isAllowedExternalLink(href)) {
    return <span>{props.children}</span>;
  }
  return (
    <Button
      variant="link"
      title={href}
      className="inline h-auto p-0 text-left font-normal break-all whitespace-normal underline"
      onClick={() => requestOpen(href)}
    >
      {props.children}
    </Button>
  );
}
