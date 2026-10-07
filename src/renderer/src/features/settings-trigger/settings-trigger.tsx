import { SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusDot } from "@renderer/components/status-dot";
import { Button } from "@renderer/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";
import { useSidebarCollapsed } from "@renderer/components/use-sidebar-collapsed";
import { cn } from "@renderer/lib/class-names";

/**
 * 设置按钮的属性.
 */
interface SettingsTriggerProps {
  /**
   * 点击按钮时的回调.
   */
  readonly onOpen: () => void;
  /**
   * 放在按钮文字之后的标记, 例如自动备份失败标记, 不给时按钮上没有标记. 侧栏折叠时按钮只剩图标,
   * 标记的文字收起但仍在按钮的无障碍名称里, 图标上改显示一个状态圆点.
   */
  readonly badge?: React.ReactNode;
}

/**
 * 展开态按钮的类名: 内容靠起始侧排列.
 */
const EXPANDED_BUTTON_CLASSES = "justify-start";

/**
 * 折叠态按钮的类名: 图标水平居中.
 */
const COLLAPSED_BUTTON_CLASSES = "justify-center";

/**
 * 折叠态文字容器的类名: 视觉上收起, 不占位, 文字仍留在无障碍名称里.
 */
const COLLAPSED_TEXT_CLASSES = "sr-only";

/**
 * 展开态文字容器的类名: 不产生自己的盒子, 文字与标记照常排在图标之后.
 */
const EXPANDED_TEXT_CLASSES = "contents";

/**
 * 侧栏底部的设置按钮, 图标加文字; 点击时通知调用方打开设置对话框, 按钮自己不持有对话框状态. 侧栏
 * 折叠时只剩图标, 悬停或聚焦时在右侧提示 "设置", 有标记时图标右上角显示状态圆点.
 * @param props 组件属性.
 * @returns 设置按钮元素.
 */
export function SettingsTrigger(
  props: SettingsTriggerProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const isCollapsed = useSidebarCollapsed();
  const hasBadge = Boolean(props.badge);
  return (
    <Tooltip disabled={!isCollapsed}>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "default"}
            className={cn(
              "w-full",
              isCollapsed ? COLLAPSED_BUTTON_CLASSES : EXPANDED_BUTTON_CLASSES,
            )}
            onClick={props.onOpen}
          />
        }
      >
        <span className="relative inline-flex">
          <SettingsIcon aria-hidden="true" data-icon="inline-start" />
          {isCollapsed && hasBadge && (
            <StatusDot className="absolute -end-1 -top-1" />
          )}
        </span>
        <span
          data-slot="settings-trigger-text"
          className={
            isCollapsed ? COLLAPSED_TEXT_CLASSES : EXPANDED_TEXT_CLASSES
          }
        >
          {t("settings.open")}
          {props.badge}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{t("settings.open")}</TooltipContent>
    </Tooltip>
  );
}
