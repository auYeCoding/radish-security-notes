import { CheckIcon } from "lucide-react";

import { Button } from "@renderer/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

import { COPY_FEEDBACK_MILLISECONDS } from "./copy-button";
import { groupTotpCode } from "./totp-code-format";
import { useTransientFlag } from "./use-transient-flag";

/**
 * 验证码按钮的属性.
 */
interface TotpCodeButtonProps {
  /**
   * 纯数字的验证码.
   */
  readonly code: string;
  /**
   * 按钮的名称, 用作无障碍标签与悬停提示, 例如 "复制 验证码".
   */
  readonly label: string;
  /**
   * 复制成功后显示并通知读屏软件的文字, 例如 "已复制".
   */
  readonly copiedLabel: string;
  /**
   * 点击时执行复制, 成功时兑现 true.
   */
  readonly onCopy: () => Promise<boolean>;
}

/**
 * 点击即复制的验证码: 验证码本身是按钮, 用等宽字体与强调色分组显示; 复制成功后验证码旁出现对勾
 * 加已复制文字, 约 2 秒后还原, 同时通知读屏软件.
 * @param props 组件属性.
 * @returns 验证码按钮元素.
 */
export function TotpCodeButton(props: TotpCodeButtonProps): React.JSX.Element {
  const feedback = useTransientFlag(COPY_FEEDBACK_MILLISECONDS);
  const handleClick = async (): Promise<void> => {
    if (await props.onCopy()) {
      feedback.raise();
    }
  };
  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="lg"
              className="font-mono text-2xl font-semibold tracking-widest text-brand"
              aria-label={`${props.label} ${props.code}`}
              onClick={() => void handleClick()}
            />
          }
        >
          {groupTotpCode(props.code)}
        </TooltipTrigger>
        <TooltipContent>{props.label}</TooltipContent>
      </Tooltip>
      {feedback.isActive ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckIcon aria-hidden="true" className="size-3.5" />
          {props.copiedLabel}
        </span>
      ) : null}
      <span role="status" className="sr-only">
        {feedback.isActive ? props.copiedLabel : ""}
      </span>
    </div>
  );
}
