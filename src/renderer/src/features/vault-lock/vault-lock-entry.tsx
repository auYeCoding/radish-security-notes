import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useVaultStore } from "@renderer/stores/use-vault-store";

import { describeLockFailure } from "./describe-lock-failure";
import { LockBlockedDialog } from "./lock-blocked-dialog";
import { LockTrigger } from "./lock-trigger";

/**
 * 锁定入口的属性.
 */
interface VaultLockEntryProps {
  /**
   * 保险库是否没有设主密码. 没设时按钮不可用, 主进程同样会拒绝.
   */
  readonly isMasterPasswordMissing: boolean;
}

/**
 * 锁定入口: 锁定按钮加无法锁定的提示框. 点击按钮请求主进程锁定, 成功后保险库状态变为已锁定,
 * 界面随之回到解锁页, 工作区整体卸载, 本入口也一并卸载; 被拒绝 (有任务进行中, 未设主密码等) 时
 * 保险库保持解锁, 弹出提示框说明原因. 锁定请求进行中再点击无效.
 * @param props 组件属性.
 * @returns 锁定按钮与按需打开的提示框元素.
 */
export function VaultLockEntry(props: VaultLockEntryProps): React.JSX.Element {
  const { t } = useTranslation();
  const lock = useVaultStore((state) => state.lock);
  const [isPending, setIsPending] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | undefined>(
    undefined,
  );
  const handleLock = async (): Promise<void> => {
    if (isPending) {
      return;
    }
    setIsPending(true);
    const result = await lock();
    setIsPending(false);
    if (!result.ok) {
      setBlockedMessage(describeLockFailure(result.reason, t));
    }
  };
  return (
    <>
      <LockTrigger
        onLock={() => void handleLock()}
        isMasterPasswordMissing={props.isMasterPasswordMissing}
      />
      {blockedMessage !== undefined && (
        <LockBlockedDialog
          message={blockedMessage}
          onClose={() => setBlockedMessage(undefined)}
        />
      )}
    </>
  );
}
