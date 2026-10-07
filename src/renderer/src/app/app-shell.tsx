import { AttachmentSection } from "@renderer/features/entry-attachments/attachment-section";
import { EntryBatchBar } from "@renderer/features/entry-batch-bar/entry-batch-bar";
import { NewEntryTrigger } from "@renderer/features/entry-create/new-entry-trigger";
import { DeleteEntryTrigger } from "@renderer/features/entry-delete/delete-entry-trigger";
import { EntryDetailPane } from "@renderer/features/entry-detail-pane/entry-detail-pane";
import { EditEntryTrigger } from "@renderer/features/entry-edit/edit-entry-trigger";
import { EntryListPane } from "@renderer/features/entry-list-pane/entry-list-pane";
import { NewFolderTrigger } from "@renderer/features/folder-create/new-folder-trigger";
import { FolderPane } from "@renderer/features/folder-pane/folder-pane";
import { PreferencesSwitchers } from "@renderer/features/preferences-switchers/preferences-switchers";
import { SearchBar } from "@renderer/features/search-bar/search-bar";
import { NewTagTrigger } from "@renderer/features/tag-create/new-tag-trigger";

import { EntryFolderDragProvider } from "./entry-folder-drag-provider";
import { FolderRowActions } from "./folder-row-actions";
import { SettingsEntry } from "./settings-entry";
import { TagRowActions } from "./tag-row-actions";

/**
 * 三栏主界面的布局: 填满窗口框架里标题栏下方的内容区. 左侧栏通高, 含标签与文件夹和底部的设置按钮 (导入,
 * 导出, 邮箱备份与从备份恢复四个入口在设置按钮打开的对话框里),
 * 标签与文件夹分区标题行各放新建按钮, 每个标签行与文件夹行尾放更多菜单; 右侧区域顶部是搜索栏与右侧的主题和语言切换, 下方是条目列表与
 * 条目详情, 列表标题行放新建按钮, 其下是批量选择栏, 详情标题行放编辑与删除按钮, 备注之后是附件区; 整个界面包在
 * 拖放根里, 列表里的条目可以拖到左侧的文件夹上. 应用名称在标题栏里, 不在侧栏. 只负责布局与组装, 不含业务逻辑.
 * @returns 三栏主界面元素.
 */
export function AppShell(): React.JSX.Element {
  return (
    <EntryFolderDragProvider>
      <div className="flex h-full bg-background text-foreground">
        <aside className="flex w-(--sidebar-width) shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground">
          <FolderPane
            tagHeaderAction={<NewTagTrigger />}
            renderTagActions={(tag) => <TagRowActions tag={tag} />}
            folderHeaderAction={<NewFolderTrigger />}
            renderFolderActions={(folder) => (
              <FolderRowActions folder={folder} />
            )}
          />
          <div className="flex flex-col gap-1 border-t border-sidebar-border p-3">
            <SettingsEntry />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-(--topbar-height) shrink-0 items-center gap-4 border-b border-border px-4">
            <SearchBar />
            <PreferencesSwitchers />
          </header>
          <div className="flex min-h-0 flex-1">
            <EntryListPane
              headerAction={<NewEntryTrigger />}
              selectionBar={<EntryBatchBar />}
            />
            <EntryDetailPane
              renderActions={(detail) => (
                <>
                  <EditEntryTrigger detail={detail} />
                  <DeleteEntryTrigger detail={detail} />
                </>
              )}
              renderAttachments={(detail) => (
                <AttachmentSection key={detail.id} entryId={detail.id} />
              )}
            />
          </div>
        </div>
      </div>
    </EntryFolderDragProvider>
  );
}
