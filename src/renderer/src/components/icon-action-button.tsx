import type { ReactNode } from "react";

import { Button } from "@renderer/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

/**
 * 图标按钮的属性.
 */
interface IconActionButtonProps {
  /**
   * 按钮的名称, 用作无障碍标签与悬停提示.
   */
  readonly label: string;
  /**
   * 点击时的回调.
   */
  readonly onClick: () => void;
  /**
   * 按钮上的图标.
   */
  readonly children: ReactNode;
  /**
   * 是否禁用按钮.
   */
  readonly isDisabled?: boolean;
}

/**
 * 图标按钮: 小号幽灵按钮, 内容只有图标, 名称放在无障碍标签与悬停提示里. 一行里有多个操作的列表项用它.
 * @param props 组件属性.
 * @returns 带悬停提示的图标按钮元素.
 */
export function IconActionButton(
  props: IconActionButtonProps,
): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={props.label}
            disabled={props.isDisabled}
            onClick={props.onClick}
          />
        }
      >
        {props.children}
      </TooltipTrigger>
      <TooltipContent>{props.label}</TooltipContent>
    </Tooltip>
  );
}
