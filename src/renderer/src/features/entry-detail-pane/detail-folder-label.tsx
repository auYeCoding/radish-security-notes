import { FolderIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useFolderStore } from "@renderer/stores/use-folder-store";

/**
 * 详情所属显示的属性.
 */
interface DetailFolderLabelProps {
  /**
   * 条目所属文件夹的编号, 未分类时为 undefined.
   */
  readonly folderId: string | undefined;
}

/**
 * 详情标题下标明条目所属位置的一行辅助文字: 文件夹图标加 "文件夹: 名称", 未分类时是 "未分类".
 * @param props 组件属性.
 * @returns 所属位置元素.
 */
export function DetailFolderLabel(
  props: DetailFolderLabelProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const folderName = useFolderStore(
    (state) =>
      state.folders.find((folder) => folder.id === props.folderId)?.name,
  );
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <FolderIcon aria-hidden="true" className="size-3.5" />
      {folderName === undefined
        ? t("entryDetail.uncategorized")
        : t("entryDetail.folder", { name: folderName })}
    </p>
  );
}
