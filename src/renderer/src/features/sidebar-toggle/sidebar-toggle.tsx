import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { IconActionButton } from "@renderer/components/icon-action-button";
import { usePreferencesStore } from "@renderer/stores/use-preferences-store";

/**
 * 侧栏折叠与展开的切换按钮: 只有图标, 图标不随界面语言变化; 名称与悬停提示随状态为 "收起侧栏" 或
 * "展开侧栏", 并用 `aria-expanded` 标出侧栏当前是否展开. 点击后经偏好 store 保存并切换, 下次启动保持.
 * @returns 切换按钮元素.
 */
export function SidebarToggle(): React.JSX.Element {
  const { t } = useTranslation();
  const isCollapsed = usePreferencesStore((state) => state.isSidebarCollapsed);
  const setSidebarCollapsed = usePreferencesStore(
    (state) => state.setSidebarCollapsed,
  );
  return (
    <IconActionButton
      label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
      isExpanded={!isCollapsed}
      onClick={() => void setSidebarCollapsed(!isCollapsed)}
    >
      {isCollapsed ? (
        <PanelLeftOpenIcon aria-hidden="true" />
      ) : (
        <PanelLeftCloseIcon aria-hidden="true" />
      )}
    </IconActionButton>
  );
}
