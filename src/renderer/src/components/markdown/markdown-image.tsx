import { ImageOffIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { MarkdownElementProps } from "./markdown-element-props";

/**
 * Markdown 里的图片: 任何来源的图片都不加载, 不产生网络请求与文件读取, 只显示图片的替代文字,
 * 没有替代文字时显示 "图片未加载".
 * @param props 组件属性.
 * @returns 替代文字元素.
 */
export function MarkdownImage(
  props: MarkdownElementProps<"img">,
): React.JSX.Element {
  const { t } = useTranslation();
  const notLoaded = t("markdown.imageNotLoaded");
  const hasAlternativeText = props.alt !== undefined && props.alt.trim() !== "";
  return (
    <span
      title={notLoaded}
      className="inline-flex items-center gap-1 text-muted-foreground"
    >
      <ImageOffIcon aria-hidden="true" className="size-3.5 shrink-0" />
      {hasAlternativeText ? props.alt : notLoaded}
    </span>
  );
}
