import { useTranslation } from "react-i18next";

import type { NotesFormat } from "@shared/entries/notes-format";

import { MarkdownView } from "@renderer/components/markdown/markdown-view";
import { useLinkBridge } from "@renderer/stores/use-link-bridge";

import { DetailCopyRow } from "./detail-copy-row";

/**
 * 详情备注行的属性.
 */
interface DetailNotesRowProps {
  /**
   * 备注原文, 没有填写时为空串.
   */
  readonly notes: string;
  /**
   * 备注的格式.
   */
  readonly format: NotesFormat;
  /**
   * 点击复制按钮时复制备注原文, 成功时兑现 true.
   */
  readonly onCopy: () => Promise<boolean>;
}

/**
 * 详情里的备注行: 纯文本保持原样与换行, Markdown 渲染成界面; 没有填写时显示辅助文字并禁用复制.
 * 复制按钮复制的都是备注原文.
 * @param props 组件属性.
 * @returns 备注行元素.
 */
export function DetailNotesRow(props: DetailNotesRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const linkBridge = useLinkBridge();
  const label = t("entryDetail.notes");
  const isMarkdown = props.format === "markdown";
  return (
    <DetailCopyRow
      label={label}
      value={props.notes}
      copyLabel={t("entryDetail.copyField", { label })}
      onCopy={props.onCopy}
      renderedValue={
        isMarkdown ? (
          <MarkdownView
            source={props.notes}
            openExternalLink={linkBridge.openExternal}
          />
        ) : undefined
      }
      contentClassName={isMarkdown ? "break-words" : undefined}
      isTopAligned={isMarkdown}
    />
  );
}
