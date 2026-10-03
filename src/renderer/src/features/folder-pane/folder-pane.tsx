import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { FolderSummary } from "@shared/folders/folder-types";
import type { TagSummary } from "@shared/tags/tag-types";

import { PaneHeading } from "@renderer/components/pane-heading";
import { ScrollArea } from "@renderer/components/ui/scroll-area";

import { FolderList } from "./folder-list";
import { TagList } from "./tag-list";

/**
 * 左侧窗格的属性.
 */
interface FolderPaneProps {
  /**
   * 标签分区标题行最右侧的操作, 例如新建按钮. 由 app 层传入, feature 之间不互相引用.
   */
  readonly tagHeaderAction?: ReactNode;
  /**
   * 生成某个标签行尾的操作, 例如更多菜单. 由 app 层传入.
   */
  readonly renderTagActions?: (tag: TagSummary) => ReactNode;
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
 * 左侧的标签与文件夹窗格, 标签在上, 文件夹在下. 标签分区列出自建的标签, 点标签可以多选, 与文件夹
 * 入口叠加筛选条目; 文件夹分区有 "全部条目" 与 "未分类" 两个固定入口和自建的文件夹.
 * @param props 组件属性.
 * @returns 标签与文件夹窗格元素.
 */
export function FolderPane(props: FolderPaneProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <ScrollArea className="min-h-0 flex-1">
      <PaneHeading
        title={t("folderPane.tagsHeading")}
        action={props.tagHeaderAction}
      />
      <TagList renderActions={props.renderTagActions} />
      <PaneHeading
        title={t("folderPane.foldersHeading")}
        action={props.folderHeaderAction}
      />
      <FolderList renderActions={props.renderFolderActions} />
    </ScrollArea>
  );
}
