import { EntryDetailPane } from "@renderer/features/entry-detail-pane/entry-detail-pane";
import { NewEntryTrigger } from "@renderer/features/entry-create/new-entry-trigger";
import { EntryListPane } from "@renderer/features/entry-list-pane/entry-list-pane";
import { FolderPane } from "@renderer/features/folder-pane/folder-pane";
import { PreferencesSwitchers } from "@renderer/features/preferences-switchers/preferences-switchers";
import { SearchBar } from "@renderer/features/search-bar/search-bar";
import { SettingsTrigger } from "@renderer/features/settings-trigger/settings-trigger";

import { SidebarBrand } from "./sidebar-brand";

/**
 * 三栏主界面的布局: 左侧栏通高, 含应用名称, 标签与文件夹和底部的设置按钮;
 * 右侧区域顶部是搜索栏与右侧的主题和语言切换, 下方是条目列表与条目详情, 列表标题行
 * 放新建按钮. 只负责布局与组装, 不含业务逻辑.
 * @returns 三栏主界面元素.
 */
export function AppShell(): React.JSX.Element {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="flex w-(--sidebar-width) shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarBrand />
        <FolderPane />
        <div className="border-t border-sidebar-border p-3">
          <SettingsTrigger />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-(--topbar-height) shrink-0 items-center gap-4 border-b border-border px-4">
          <SearchBar />
          <PreferencesSwitchers />
        </header>
        <div className="flex min-h-0 flex-1">
          <EntryListPane headerAction={<NewEntryTrigger />} />
          <EntryDetailPane />
        </div>
      </div>
    </div>
  );
}
