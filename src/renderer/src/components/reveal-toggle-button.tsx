import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { InputGroupButton } from "@renderer/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";

/**
 * 显示与隐藏切换按钮的属性.
 */
interface RevealToggleButtonProps {
  /**
   * 当前是否已显示明文.
   */
  readonly isRevealed: boolean;
  /**
   * 点击按钮时的回调.
   */
  readonly onToggle: () => void;
  /**
   * 已隐藏时按钮的名称, 不给时用密码的 "显示密码".
   */
  readonly showLabel?: string;
  /**
   * 已显示时按钮的名称, 不给时用密码的 "隐藏密码".
   */
  readonly hideLabel?: string;
}

/**
 * 输入框右侧的显示与隐藏切换按钮: 用眼睛图标表示, 名称放在无障碍标签与悬停提示里, 切换语言时
 * 宽度不变. 默认名称针对密码, 其它内容可以用 `showLabel` 与 `hideLabel` 换成自己的名称.
 * @param props 组件属性.
 * @returns 切换按钮元素.
 */
export function RevealToggleButton(
  props: RevealToggleButtonProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const label = props.isRevealed
    ? (props.hideLabel ?? t("vault.password.hide"))
    : (props.showLabel ?? t("vault.password.show"));
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <InputGroupButton
            size="icon-xs"
            aria-label={label}
            onClick={props.onToggle}
          />
        }
      >
        {props.isRevealed ? (
          <EyeOffIcon aria-hidden="true" />
        ) : (
          <EyeIcon aria-hidden="true" />
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
