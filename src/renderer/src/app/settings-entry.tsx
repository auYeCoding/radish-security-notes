import { useState } from "react";

import { AutoBackupFailureBadge } from "@renderer/features/email-backup/auto-backup-failure-badge";
import { EmailBackupTrigger } from "@renderer/features/email-backup/email-backup-trigger";
import { useAutoBackupFailure } from "@renderer/features/email-backup/use-auto-backup-failure";
import { ExportTrigger } from "@renderer/features/export-data/export-trigger";
import { ImportTrigger } from "@renderer/features/import-data/import-trigger";
import { MasterPasswordSwitch } from "@renderer/features/master-password-switch/master-password-switch";
import { RecoveryKeyViewer } from "@renderer/features/recovery-key-viewer/recovery-key-viewer";
import { RestoreTrigger } from "@renderer/features/restore-backup/restore-trigger";
import { SettingsDialog } from "@renderer/features/settings-dialog/settings-dialog";
import { SettingsTrigger } from "@renderer/features/settings-trigger/settings-trigger";

/**
 * 设置入口的装配: 侧栏底部的设置按钮与它打开的设置对话框. 持有对话框的开合状态, 把导入, 导出, 邮箱
 * 备份, 从备份恢复四个入口放进对话框的 "数据" 分区, 把主密码开关与查看恢复密钥放进 "安全" 分区; 最近一次自动备份
 * 失败时设置按钮上有失败标记.
 * 对话框打开期间不读取失败状态, 标记由对话框里的邮箱备份入口显示, 关闭后立即重新读取.
 * @returns 设置按钮与设置对话框元素.
 */
export function SettingsEntry(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const failureReason = useAutoBackupFailure(isOpen);
  return (
    <>
      <SettingsTrigger
        onOpen={() => setIsOpen(true)}
        badge={failureReason !== undefined && <AutoBackupFailureBadge />}
      />
      {isOpen && (
        <SettingsDialog
          onClose={() => setIsOpen(false)}
          data={{
            importAction: <ImportTrigger />,
            exportAction: <ExportTrigger />,
            emailBackupAction: <EmailBackupTrigger />,
            restoreAction: <RestoreTrigger />,
          }}
          security={{
            masterPasswordAction: <MasterPasswordSwitch />,
            recoveryKeyAction: <RecoveryKeyViewer />,
          }}
        />
      )}
    </>
  );
}
