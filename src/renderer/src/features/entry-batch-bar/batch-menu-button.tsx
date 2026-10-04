import type { ReactNode } from "react";

import { Button } from "@renderer/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

/**
 * 批量操作栏下拉菜单按钮的属性.
 */
interface BatchMenuButtonProps {
  /**
   * 按钮的无障碍名称与悬停提示.
   */
  readonly label: string;
  /**
   * 按钮里的图标.
   */
  readonly icon: ReactNode;
  /**
   * 是否禁用.
   */
  readonly isDisabled: boolean;
  /**
   * 菜单项, 由调用方给出.
   */
  readonly children: ReactNode;
}

/**
 * 批量操作栏里的下拉菜单按钮: 图标按钮带悬停提示, 点开是下拉菜单, 键盘可以聚焦并用方向键选择.
 * 移入文件夹, 加标签与摘标签共用.
 * @param props 组件属性.
 * @returns 菜单按钮元素.
 */
export function BatchMenuButton(
  props: BatchMenuButtonProps,
): React.JSX.Element {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={props.label}
                  disabled={props.isDisabled}
                />
              }
            />
          }
        >
          {props.icon}
        </TooltipTrigger>
        <TooltipContent>{props.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        {props.children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
