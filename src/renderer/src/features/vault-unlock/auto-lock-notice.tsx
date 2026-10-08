import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { AutoLockReason } from "@shared/vault/auto-lock-reason";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";

/**
 * 每种自动锁定原因对应的说明文案键.
 */
const NOTICE_KEYS = {
  idle: "vault.unlock.autoLocked.idle",
  "screen-lock": "vault.unlock.autoLocked.screenLock",
  sleep: "vault.unlock.autoLocked.sleep",
} as const satisfies Record<AutoLockReason, string>;

/**
 * 自动锁定说明的属性.
 */
interface AutoLockNoticeProps {
  /**
   * 保险库被自动锁定的原因.
   */
  readonly reason: AutoLockReason;
}

/**
 * 解锁页上的一行说明: 告诉用户保险库为什么被自动锁定. 只是通知, 不是错误, 屏幕阅读器礼貌地朗读.
 * @param props 组件属性.
 * @returns 提示条元素.
 */
export function AutoLockNotice(props: AutoLockNoticeProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Alert role="status" className="mb-4">
      <Info aria-hidden="true" />
      <AlertDescription>{t(NOTICE_KEYS[props.reason])}</AlertDescription>
    </Alert>
  );
}
