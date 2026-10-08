import { useTranslation } from "react-i18next";

import { CollapsibleText } from "@renderer/components/collapsible-text";
import { Button } from "@renderer/components/ui/button";
import type { CollapseState } from "@renderer/components/ui/collapse-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";
import { useSidebarCollapsed } from "@renderer/components/use-sidebar-collapsed";

import { SettingsTriggerIcon } from "./settings-trigger-icon";

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
   * 标记的文字淡出并收窄但仍在按钮的无障碍名称里, 图标上改显示一个状态圆点.
   */
  readonly badge?: React.ReactNode;
}

/**
 * 按钮的类名: 占满一行, 图标与文字这一组始终居中. 按钮本身不留内边距与间距, 它们由图标格与文字区
 * 自己的内边距过渡, 所以展开时图标靠起始侧, 折叠时图标居中.
 */
const BUTTON_CLASSES = "w-full justify-center text-start";

/**
 * 文字区外层在两种状态下的类名: 展开时占满剩余宽度并留出结束侧内边距, 折叠时份额与内边距归零.
 */
const TEXT_STATE_CLASSES: Readonly<Record<CollapseState, string>> = {
  expanded: "grow pe-2.5",
  collapsed: "grow-0 pe-0",
};

/**
 * 文字区内层的排布: 按钮名称与标记横排并垂直居中.
 */
const TEXT_CONTENT_CLASSES = "flex items-center gap-1.5";

/**
 * 侧栏底部的设置按钮, 图标加文字; 点击时通知调用方打开设置对话框, 按钮自己不持有对话框状态. 侧栏
 * 折叠时文字淡出并收窄, 只剩图标, 悬停或聚焦时在右侧提示 "设置", 有标记时图标右上角淡入状态圆点.
 * @param props 组件属性.
 * @returns 设置按钮元素.
 */
export function SettingsTrigger(
  props: SettingsTriggerProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const isCollapsed = useSidebarCollapsed();
  return (
    <Tooltip disabled={!isCollapsed}>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={BUTTON_CLASSES}
            onClick={props.onOpen}
          />
        }
      >
        <SettingsTriggerIcon
          isCollapsed={isCollapsed}
          hasBadge={Boolean(props.badge)}
        />
        <CollapsibleText
          slot="settings-trigger-text"
          isCollapsed={isCollapsed}
          stateClasses={TEXT_STATE_CLASSES}
          contentClassName={TEXT_CONTENT_CLASSES}
        >
          {t("settings.open")}
          {props.badge}
        </CollapsibleText>
      </TooltipTrigger>
      <TooltipContent side="right">{t("settings.open")}</TooltipContent>
    </Tooltip>
  );
}
