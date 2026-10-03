import type { ReactNode } from "react";

import type { EntryDetail } from "@shared/entries/entry-types";

import { DetailFolderLabel } from "./detail-folder-label";
import { DetailTagBadges } from "./detail-tag-badges";
import { DetailTypeLabel } from "./detail-type-label";

/**
 * 详情标题行的属性.
 */
interface EntryDetailHeaderProps {
  /**
   * 要展示的条目详情.
   */
  readonly detail: EntryDetail;
  /**
   * 标题行右侧的操作, 例如编辑与删除按钮.
   */
  readonly actions?: ReactNode;
}

/**
 * 详情的标题行: 左侧上方标明类型, 其下是名称, 所属文件夹与带的标签, 右侧是调用方给出的操作.
 * @param props 组件属性.
 * @returns 标题行元素.
 */
export function EntryDetailHeader(
  props: EntryDetailHeaderProps,
): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <DetailTypeLabel typeKey={props.detail.type} />
        <h2 className="text-xl font-semibold break-words">
          {props.detail.name}
        </h2>
        <DetailFolderLabel folderId={props.detail.folderId} />
        <DetailTagBadges tagIds={props.detail.tagIds} />
      </div>
      {props.actions !== undefined && (
        <div className="flex shrink-0 items-center gap-1">{props.actions}</div>
      )}
    </div>
  );
}
