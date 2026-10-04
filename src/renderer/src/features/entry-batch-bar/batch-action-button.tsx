import type { ReactNode } from "react";

import { Button } from "@renderer/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

/**
 * 批量操作栏图标按钮的属性.
 */
interface BatchActionButtonProps {
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
   * 点击时的回调.
   */
  readonly onClick: () => void;
}

/**
 * 批量操作栏里的图标按钮: 名称放在无障碍标签与悬停提示里, 窄的列表窗格里也放得下全部操作.
 * @param props 组件属性.
 * @returns 图标按钮元素.
 */
export function BatchActionButton(
  props: BatchActionButtonProps,
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
        {props.icon}
      </TooltipTrigger>
      <TooltipContent>{props.label}</TooltipContent>
    </Tooltip>
  );
}
