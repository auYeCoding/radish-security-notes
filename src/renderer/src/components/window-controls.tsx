import { CopyIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { WindowControlButton } from "./window-control-button";

/**
 * 窗口按钮组的属性.
 */
interface WindowControlsProps {
  /**
   * 窗口当前是否最大化: 为真时第二个按钮显示还原.
   */
  readonly isMaximized: boolean;
  /**
   * 点击最小化按钮时执行.
   */
  readonly onMinimize: () => void;
  /**
   * 点击最大化或还原按钮时执行.
   */
  readonly onToggleMaximize: () => void;
  /**
   * 点击关闭按钮时执行.
   */
  readonly onClose: () => void;
}

/**
 * 窗口按钮组: 最小化, 最大化或还原, 关闭三个按钮依次排开, 整组标为不拖动区域. 窗口最大化时第二个
 * 按钮的图标与名称变为还原. 图标不随界面语言变化, 名称与悬停提示走 i18n.
 * @param props 组件属性.
 * @returns 窗口按钮组元素.
 */
export function WindowControls(props: WindowControlsProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("window.controls")}
      className="app-region-no-drag flex h-full items-stretch"
    >
      <WindowControlButton
        label={t("window.minimize")}
        onClick={props.onMinimize}
      >
        <MinusIcon aria-hidden="true" />
      </WindowControlButton>
      <WindowControlButton
        label={props.isMaximized ? t("window.restore") : t("window.maximize")}
        onClick={props.onToggleMaximize}
      >
        {props.isMaximized ? (
          <CopyIcon aria-hidden="true" />
        ) : (
          <SquareIcon aria-hidden="true" />
        )}
      </WindowControlButton>
      <WindowControlButton
        label={t("window.close")}
        onClick={props.onClose}
        isDanger
      >
        <XIcon aria-hidden="true" />
      </WindowControlButton>
    </div>
  );
}
