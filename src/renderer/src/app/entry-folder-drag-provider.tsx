import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { resolveEntryDrop } from "@shared/folders/folder-drop-target";

import { DragPreview } from "@renderer/components/drag-preview";
import { DragDropProvider } from "@renderer/lib/drag-drop/drag-drop-provider";
import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useFolderStore } from "@renderer/stores/use-folder-store";
import { useMoveEntryToFolder } from "@renderer/stores/use-move-entry-to-folder";

import {
  createEntryFolderAnnouncements,
  entryNameOf,
} from "./entry-folder-announcements";

/**
 * 条目拖放根的属性.
 */
interface EntryFolderDragProviderProps {
  /**
   * 条目列表与侧栏所在的子树.
   */
  readonly children: ReactNode;
}

/**
 * 把条目拖进文件夹的拖放根: 条目放在文件夹或 "未分类" 行上时, 经文件夹 store 把它放进去并更新列表;
 * 条目已在目标里则什么都不做. 放入失败时不打扰用户, 条目留在原处.
 * @param props 组件属性.
 * @returns 拖放根元素.
 */
export function EntryFolderDragProvider(
  props: EntryFolderDragProviderProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const moveEntry = useMoveEntryToFolder();
  const entries = useEntryStore((state) => state.entries);
  const folders = useFolderStore((state) => state.folders);
  const announcements = useMemo(
    () => createEntryFolderAnnouncements(entries, folders, t),
    [entries, folders, t],
  );
  return (
    <DragDropProvider
      announcements={announcements}
      instructions={t("dragDrop.instructions")}
      renderPreview={(sourceId) => (
        <DragPreview label={entryNameOf(entries, sourceId)} />
      )}
      onDrop={(sourceId, targetId) => {
        const drop = resolveEntryDrop(entries, sourceId, targetId);
        if (drop !== undefined) {
          void moveEntry(drop.entryId, drop.folderId);
        }
      }}
    >
      {props.children}
    </DragDropProvider>
  );
}
