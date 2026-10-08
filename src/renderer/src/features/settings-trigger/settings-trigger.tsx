import { SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SidebarFooterButton } from "@renderer/components/sidebar-footer-button";

/**
 * 设置按钮的属性.
 */
interface SettingsTriggerProps {
  /**
   * 点击按钮时的回调.
   */
  readonly onOpen: () => void;
  /**
   * 放在按钮文字之后的标记, 例如自动备份失败标记, 不给时按钮上没有标记. 侧栏折叠时按钮只剩图标,
   * 标记的文字淡出并收窄但仍在按钮的无障碍名称里, 图标上改显示一个状态圆点.
   */
  readonly badge?: React.ReactNode;
}

/**
 * 侧栏底部的设置按钮, 图标加文字; 点击时通知调用方打开设置对话框, 按钮自己不持有对话框状态. 侧栏
 * 折叠时文字淡出并收窄, 只剩图标, 悬停或聚焦时在右侧提示 "设置", 有标记时图标右上角淡入状态圆点.
 * 外观与折叠过渡由侧栏底部按钮统一提供.
 * @param props 组件属性.
 * @returns 设置按钮元素.
 */
export function SettingsTrigger(
  props: SettingsTriggerProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <SidebarFooterButton
      icon={<SettingsIcon aria-hidden="true" data-icon="inline-start" />}
      label={t("settings.open")}
      textSlot="settings-trigger-text"
      onClick={props.onOpen}
      badge={props.badge}
    />
  );
}
