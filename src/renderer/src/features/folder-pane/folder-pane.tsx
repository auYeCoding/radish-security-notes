import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { FolderSummary } from "@shared/folders/folder-types";

import { EmptyState } from "@renderer/components/empty-state";
import { PaneHeading } from "@renderer/components/pane-heading";
import { ScrollArea } from "@renderer/components/ui/scroll-area";

import { FolderList } from "./folder-list";

/**
 * 左侧窗格的属性.
 */
interface FolderPaneProps {
  /**
   * 文件夹分区标题行最右侧的操作, 例如新建按钮. 由 app 层传入, feature 之间不互相引用.
   */
  readonly folderHeaderAction?: ReactNode;
  /**
   * 生成某个文件夹行尾的操作, 例如更多菜单. 由 app 层传入.
   */
  readonly renderFolderActions?: (folder: FolderSummary) => ReactNode;
}

/**
 * 左侧的标签与文件夹窗格, 标签在上, 文件夹在下. 标签分区目前只有标题与空状态说明, 没有数据;
 * 文件夹分区有 "全部条目" 与 "未分类" 两个固定入口和自建的文件夹.
 * @param props 组件属性.
 * @returns 标签与文件夹窗格元素.
 */
export function FolderPane(props: FolderPaneProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <ScrollArea className="min-h-0 flex-1">
      <PaneHeading title={t("folderPane.tagsHeading")} />
      <EmptyState message={t("folderPane.emptyTags")} />
      <PaneHeading
        title={t("folderPane.foldersHeading")}
        action={props.folderHeaderAction}
      />
      <FolderList renderActions={props.renderFolderActions} />
    </ScrollArea>
  );
}
