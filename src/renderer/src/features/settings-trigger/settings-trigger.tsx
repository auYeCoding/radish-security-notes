import { SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";

/**
 * 设置按钮的属性.
 */
interface SettingsTriggerProps {
  /**
   * 点击按钮时的回调.
   */
  readonly onOpen: () => void;
  /**
   * 放在按钮文字之后的标记, 例如自动备份失败标记, 不给时按钮上没有标记.
   */
  readonly badge?: React.ReactNode;
}

/**
 * 侧栏底部的设置按钮, 图标加文字; 点击时通知调用方打开设置对话框, 按钮自己不持有对话框状态.
 * @param props 组件属性.
 * @returns 设置按钮元素.
 */
export function SettingsTrigger(
  props: SettingsTriggerProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      onClick={props.onOpen}
    >
      <SettingsIcon aria-hidden="true" data-icon="inline-start" />
      {t("settings.open")}
      {props.badge}
    </Button>
  );
}
