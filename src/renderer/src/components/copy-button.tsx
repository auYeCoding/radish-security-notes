import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@renderer/components/ui/button";
import { FADE_IN_MOTION } from "@renderer/components/ui/state-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

import { useTransientFlag } from "./use-transient-flag";

/**
 * 复制成功后按钮保持 "已复制" 外观的时长, 单位毫秒.
 */
export const COPY_FEEDBACK_MILLISECONDS = 2000;

/**
 * 复制按钮的属性.
 */
interface CopyButtonProps {
  /**
   * 按钮的名称, 用作无障碍标签与悬停提示, 例如 "复制账号".
   */
  readonly label: string;
  /**
   * 复制成功后按钮上显示并通知读屏软件的文字, 例如 "已复制".
   */
  readonly copiedLabel: string;
  /**
   * 点击时执行复制, 成功时兑现 true.
   */
  readonly onCopy: () => Promise<boolean>;
  /**
   * 是否禁用按钮, 例如要复制的内容为空.
   */
  readonly isDisabled?: boolean;
}

/**
 * 复制按钮: 图标按钮, 名称放在无障碍标签与悬停提示里; 复制成功后按钮就地变为对勾加
 * 已复制文字, 约 2 秒后还原, 同时通知读屏软件.
 * @param props 组件属性.
 * @returns 复制按钮元素.
 */
export function CopyButton(props: CopyButtonProps): React.JSX.Element {
  const feedback = useTransientFlag(COPY_FEEDBACK_MILLISECONDS);
  const handleClick = async (): Promise<void> => {
    if (await props.onCopy()) {
      feedback.raise();
    }
  };
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              aria-label={props.label}
              disabled={props.isDisabled}
              onClick={() => void handleClick()}
            />
          }
        >
          {feedback.isActive ? (
            <>
              <CheckIcon aria-hidden="true" className={FADE_IN_MOTION} />
              {props.copiedLabel}
            </>
          ) : (
            <CopyIcon aria-hidden="true" />
          )}
        </TooltipTrigger>
        <TooltipContent>{props.label}</TooltipContent>
      </Tooltip>
      <span role="status" className="sr-only">
        {feedback.isActive ? props.copiedLabel : ""}
      </span>
    </>
  );
}
