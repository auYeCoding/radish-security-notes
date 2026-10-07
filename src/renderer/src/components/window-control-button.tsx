import type { ReactNode } from "react";

import { Button } from "@renderer/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";
import { cn } from "@renderer/lib/class-names";

/**
 * 窗口按钮的属性.
 */
interface WindowControlButtonProps {
  /**
   * 按钮的名称, 用作无障碍标签与悬停提示, 例如 "最小化".
   */
  readonly label: string;
  /**
   * 点击时执行的窗口操作.
   */
  readonly onClick: () => void;
  /**
   * 是否是关闭这类危险操作的按钮: 为真时悬停用危险色 token 高亮.
   */
  readonly isDanger?: boolean;
  /**
   * 按钮上的图标.
   */
  readonly children: ReactNode;
}

/**
 * 危险按钮悬停时的类名, 取自危险色 token.
 */
const DANGER_HOVER_CLASSES =
  "hover:bg-destructive/20 hover:text-destructive dark:hover:bg-destructive/30";

/**
 * 窗口按钮: 铺满标题栏高度的图标按钮, 名称放在无障碍标签与悬停提示里, 标为不拖动区域, 点击它不会
 * 变成拖动窗口.
 * @param props 组件属性.
 * @returns 窗口按钮元素.
 */
export function WindowControlButton(
  props: WindowControlButtonProps,
): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            aria-label={props.label}
            onClick={props.onClick}
            className={cn(
              "app-region-no-drag h-full w-11 rounded-none",
              props.isDanger && DANGER_HOVER_CLASSES,
            )}
          />
        }
      >
        {props.children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{props.label}</TooltipContent>
    </Tooltip>
  );
}
