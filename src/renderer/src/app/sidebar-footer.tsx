import { VaultLockEntry } from "@renderer/features/vault-lock/vault-lock-entry";
import { useMasterPasswordState } from "@renderer/stores/use-master-password-state";

import { SettingsEntry } from "./settings-entry";

/**
 * 侧栏底部的装配: 设置入口与锁定入口上下排列. 锁定入口要知道保险库有没有设主密码, 这个状态在这里
 * 读取并交给它; 设置对话框里的自动锁定控件同样依赖这个状态. 主密码只能在设置对话框里开关, 所以
 * 在对话框里开关成功时与对话框关闭后都重新读取, 锁定按钮与自动锁定控件随之可用或不可用. 只负责
 * 装配, 不含业务逻辑.
 * @returns 侧栏底部元素.
 */
export function SidebarFooter(): React.JSX.Element {
  const { state, refresh } = useMasterPasswordState();
  const isMasterPasswordMissing = state === "disabled";
  return (
    <div className="flex flex-col gap-1 border-t border-sidebar-border p-3">
      <SettingsEntry
        onClosed={refresh}
        isMasterPasswordMissing={isMasterPasswordMissing}
        onMasterPasswordChanged={refresh}
      />
      <VaultLockEntry isMasterPasswordMissing={isMasterPasswordMissing} />
    </div>
  );
}
