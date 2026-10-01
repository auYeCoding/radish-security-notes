import { useTranslation } from "react-i18next";

import { EmptyState } from "@renderer/components/empty-state";
import { PaneHeading } from "@renderer/components/pane-heading";
import { ScrollArea } from "@renderer/components/ui/scroll-area";

/**
 * 左侧的标签与文件夹窗格, 标签在上, 文件夹在下. 现在只有两个分区的标题与空状态说明,
 * 没有数据.
 * @returns 标签与文件夹窗格元素.
 */
export function FolderPane(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <ScrollArea className="min-h-0 flex-1">
      <PaneHeading title={t("folderPane.tagsHeading")} />
      <EmptyState message={t("folderPane.emptyTags")} />
      <PaneHeading title={t("folderPane.foldersHeading")} />
      <EmptyState message={t("folderPane.emptyFolders")} />
    </ScrollArea>
  );
}
