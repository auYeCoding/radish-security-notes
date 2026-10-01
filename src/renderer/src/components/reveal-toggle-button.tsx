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
}

/**
 * 输入框右侧的显示与隐藏切换按钮: 用眼睛图标表示, 名称放在无障碍标签与悬停提示里, 切换语言时
 * 宽度不变.
 * @param props 组件属性.
 * @returns 切换按钮元素.
 */
export function RevealToggleButton(
  props: RevealToggleButtonProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const label = props.isRevealed
    ? t("vault.password.hide")
    : t("vault.password.show");
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
