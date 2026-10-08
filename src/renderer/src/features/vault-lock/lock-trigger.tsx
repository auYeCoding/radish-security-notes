import { LockIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SidebarFooterButton } from "@renderer/components/sidebar-footer-button";

/**
 * 锁定按钮的属性.
 */
interface LockTriggerProps {
  /**
   * 点击按钮时的回调.
   */
  readonly onLock: () => void;
  /**
   * 按钮是否因为没有设主密码而不可用. 不可用时点击无效, 悬停或聚焦时提示原因.
   */
  readonly isMasterPasswordMissing: boolean;
}

/**
 * 侧栏底部的锁定按钮, 锁形图标加文字; 点击时通知调用方锁定, 按钮自己不持有锁定状态. 外观, 折叠时
 * 只剩图标并悬停提示 "锁定", 以及不可用时的原因提示都由侧栏底部按钮统一提供.
 * @param props 组件属性.
 * @returns 锁定按钮元素.
 */
export function LockTrigger(props: LockTriggerProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <SidebarFooterButton
      icon={<LockIcon aria-hidden="true" data-icon="inline-start" />}
      label={t("vault.lock.action")}
      textSlot="lock-trigger-text"
      onClick={props.onLock}
      unavailableReason={
        props.isMasterPasswordMissing ? t("vault.lock.unavailable") : undefined
      }
    />
  );
}
