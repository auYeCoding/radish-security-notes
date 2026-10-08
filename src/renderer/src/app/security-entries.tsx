import { AutoLockIdleControls } from "@renderer/features/auto-lock-settings/auto-lock-idle-controls";
import { AutoLockToggle } from "@renderer/features/auto-lock-settings/auto-lock-toggle";
import { MasterPasswordSwitch } from "@renderer/features/master-password-switch/master-password-switch";
import { RecoveryKeyViewer } from "@renderer/features/recovery-key-viewer/recovery-key-viewer";
import type { SettingsSecurityEntries } from "@renderer/features/settings-dialog/settings-security-section";

/**
 * 生成安全分区操作元素所需的信息.
 */
interface SecurityEntriesOptions {
  /**
   * 保险库是否没有设主密码. 没设时自动锁定不生效, 三个自动锁定控件不可用.
   */
  readonly isMasterPasswordMissing: boolean;
  /**
   * 开启或关闭主密码成功之后的回调.
   */
  readonly onMasterPasswordChanged?: () => void;
}

/**
 * 装配设置对话框 "安全" 分区各行右侧的操作元素: 主密码开关, 查看恢复密钥, 空闲自动锁定, 锁屏时锁定,
 * 休眠时锁定. 没设主密码时三个自动锁定控件不可用.
 * @param options 主密码状态与开关主密码成功后的回调.
 * @returns 安全分区的操作元素.
 */
export function createSecurityEntries(
  options: SecurityEntriesOptions,
): SettingsSecurityEntries {
  const { isMasterPasswordMissing } = options;
  return {
    masterPasswordAction: (
      <MasterPasswordSwitch onChanged={options.onMasterPasswordChanged} />
    ),
    recoveryKeyAction: <RecoveryKeyViewer />,
    idleLockAction: (
      <AutoLockIdleControls isDisabled={isMasterPasswordMissing} />
    ),
    screenLockAction: (
      <AutoLockToggle
        settingKey="isScreenLockEnabled"
        isDisabled={isMasterPasswordMissing}
      />
    ),
    sleepLockAction: (
      <AutoLockToggle
        settingKey="isSleepLockEnabled"
        isDisabled={isMasterPasswordMissing}
      />
    ),
    isAutoLockUnavailable: isMasterPasswordMissing,
  };
}
