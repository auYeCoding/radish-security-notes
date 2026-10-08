import type { ReactNode } from "react";

import { CollapsibleText } from "@renderer/components/collapsible-text";
import { SidebarButtonIcon } from "@renderer/components/sidebar-button-icon";
import { Button } from "@renderer/components/ui/button";
import type { CollapseState } from "@renderer/components/ui/collapse-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";
import { useSidebarCollapsed } from "@renderer/components/use-sidebar-collapsed";
import { cn } from "@renderer/lib/class-names";

/**
 * 侧栏底部按钮的属性.
 */
interface SidebarFooterButtonProps {
  /**
   * 按钮的图标元素.
   */
  readonly icon: ReactNode;
  /**
   * 按钮的名称, 同时是按钮文字与折叠后的悬停提示.
   */
  readonly label: string;
  /**
   * 文字区外层元素的 `data-slot` 取值, 用来在测试和样式里定位.
   */
  readonly textSlot: string;
  /**
   * 点击按钮时的回调, 按钮不可用时不会被调用.
   */
  readonly onClick: () => void;
  /**
   * 放在按钮文字之后的标记, 不给时按钮上没有标记. 侧栏折叠时按钮只剩图标, 标记的文字淡出并收窄
   * 但仍在按钮的无障碍名称里, 图标上改显示一个状态圆点.
   */
  readonly badge?: ReactNode;
  /**
   * 按钮不可用的原因, 给出时按钮保持可聚焦并标为不可用, 点击无效, 悬停或聚焦时在右侧提示这段
   * 原因, 不给时按钮可用.
   */
  readonly unavailableReason?: string;
}

/**
 * 按钮的类名: 占满一行, 图标与文字这一组始终居中. 按钮本身不留内边距与间距, 它们由图标格与文字区
 * 自己的内边距过渡, 所以展开时图标靠起始侧, 折叠时图标居中.
 */
const BUTTON_CLASSES = "w-full justify-center text-start";

/**
 * 按钮不可用时追加的类名: 变淡, 悬停不再变色, 指针恢复默认. 用 `aria-disabled` 而不是原生禁用,
 * 才能收到悬停并显示原因.
 */
const UNAVAILABLE_CLASSES =
  "aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent";

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
 * 侧栏底部的按钮, 图标加文字. 侧栏折叠时文字淡出并收窄, 只剩图标, 悬停或聚焦时在右侧提示按钮
 * 名称; 不可用时悬停或聚焦提示不可用的原因. 按钮自己不持有业务状态. 设置按钮与锁定按钮共用.
 * @param props 组件属性.
 * @returns 侧栏底部按钮元素.
 */
export function SidebarFooterButton(
  props: SidebarFooterButtonProps,
): React.JSX.Element {
  const isCollapsed = useSidebarCollapsed();
  const isUnavailable = props.unavailableReason !== undefined;
  return (
    <Tooltip disabled={!isCollapsed && !isUnavailable}>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(BUTTON_CLASSES, isUnavailable && UNAVAILABLE_CLASSES)}
            disabled={isUnavailable}
            focusableWhenDisabled={isUnavailable}
            onClick={props.onClick}
          />
        }
      >
        <SidebarButtonIcon
          icon={props.icon}
          isCollapsed={isCollapsed}
          hasBadge={Boolean(props.badge)}
        />
        <CollapsibleText
          slot={props.textSlot}
          isCollapsed={isCollapsed}
          stateClasses={TEXT_STATE_CLASSES}
          contentClassName={TEXT_CONTENT_CLASSES}
        >
          {props.label}
          {props.badge}
        </CollapsibleText>
      </TooltipTrigger>
      <TooltipContent side="right">
        {props.unavailableReason ?? props.label}
      </TooltipContent>
    </Tooltip>
  );
}
