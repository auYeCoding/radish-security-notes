import { useState } from "react";

import { AutoBackupFailureBadge } from "@renderer/features/email-backup/auto-backup-failure-badge";
import { EmailBackupTrigger } from "@renderer/features/email-backup/email-backup-trigger";
import { useAutoBackupFailure } from "@renderer/features/email-backup/use-auto-backup-failure";
import { ExportTrigger } from "@renderer/features/export-data/export-trigger";
import { ImportTrigger } from "@renderer/features/import-data/import-trigger";
import { LanguageSwitcher } from "@renderer/features/preferences-switchers/language-switcher";
import { ThemeSwitcher } from "@renderer/features/preferences-switchers/theme-switcher";
import { RestoreTrigger } from "@renderer/features/restore-backup/restore-trigger";
import { SettingsDialog } from "@renderer/features/settings-dialog/settings-dialog";
import { SettingsTrigger } from "@renderer/features/settings-trigger/settings-trigger";
import { NewTagTrigger } from "@renderer/features/tag-create/new-tag-trigger";

import { createSecurityEntries } from "./security-entries";
import { SettingsTagList } from "./settings-tag-list";

/**
 * 设置入口的属性.
 */
interface SettingsEntryProps {
  /**
   * 设置对话框关闭之后的回调, 调用方借它重新读取在对话框里可能被改动的状态, 例如主密码是否开启.
   */
  readonly onClosed?: () => void;
  /**
   * 保险库是否没有设主密码. 没设时自动锁定不生效, 安全分区里的自动锁定控件不可用并说明原因. 默认视为
   * 设了.
   */
  readonly isMasterPasswordMissing?: boolean;
  /**
   * 在对话框里开启或关闭主密码成功之后的回调, 调用方借它立即重新读取主密码状态.
   */
  readonly onMasterPasswordChanged?: () => void;
}

/**
 * 设置入口的装配: 侧栏底部的设置按钮与它打开的设置对话框. 持有对话框的开合状态, 把主题切换与语言切换
 * 放进对话框的 "外观与语言" 分区, 把新建标签入口与标签列表放进 "标签" 分区, 把导入, 导出, 邮箱备份,
 * 从备份恢复四个入口放进 "数据" 分区, 把主密码开关,
 * 查看恢复密钥与空闲, 锁屏, 休眠三个自动锁定控件放进 "安全" 分区; 最近一次自动备份失败时设置按钮上有失败标记.
 * 对话框打开期间不读取失败状态, 标记由对话框里的邮箱备份入口显示, 关闭后立即重新读取.
 * @param props 组件属性.
 * @returns 设置按钮与设置对话框元素.
 */
export function SettingsEntry(props: SettingsEntryProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const failureReason = useAutoBackupFailure(isOpen);
  const handleClose = (): void => {
    setIsOpen(false);
    props.onClosed?.();
  };
  return (
    <>
      <SettingsTrigger
        onOpen={() => setIsOpen(true)}
        badge={failureReason !== undefined && <AutoBackupFailureBadge />}
      />
      {isOpen && (
        <SettingsDialog
          onClose={handleClose}
          appearance={{
            themeAction: <ThemeSwitcher />,
            languageAction: <LanguageSwitcher />,
          }}
          tags={{
            createAction: <NewTagTrigger />,
            tagList: <SettingsTagList />,
          }}
          data={{
            importAction: <ImportTrigger />,
            exportAction: <ExportTrigger />,
            emailBackupAction: <EmailBackupTrigger />,
            restoreAction: <RestoreTrigger />,
          }}
          security={createSecurityEntries({
            isMasterPasswordMissing: props.isMasterPasswordMissing === true,
            onMasterPasswordChanged: props.onMasterPasswordChanged,
          })}
        />
      )}
    </>
  );
}
