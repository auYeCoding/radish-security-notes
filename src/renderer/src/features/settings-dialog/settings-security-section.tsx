import { useTranslation } from "react-i18next";

import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

/**
 * "安全" 分区各行右侧的操作元素, 由装配层提供, 设置 feature 不引用其它 feature.
 */
export interface SettingsSecurityEntries {
  /**
   * 主密码行的操作元素.
   */
  readonly masterPasswordAction: React.ReactNode;
  /**
   * 恢复密钥行的操作元素.
   */
  readonly recoveryKeyAction: React.ReactNode;
  /**
   * 空闲自动锁定行的操作元素.
   */
  readonly idleLockAction: React.ReactNode;
  /**
   * 锁屏时锁定行的操作元素.
   */
  readonly screenLockAction: React.ReactNode;
  /**
   * 休眠时锁定行的操作元素.
   */
  readonly sleepLockAction: React.ReactNode;
  /**
   * 自动锁定当前是否不可用 (没有设主密码). 不可用时三行的说明之后有一行原因.
   */
  readonly isAutoLockUnavailable: boolean;
}

/**
 * 安全分区的属性.
 */
interface SettingsSecuritySectionProps {
  /**
   * 各行右侧的操作元素.
   */
  readonly entries: SettingsSecurityEntries;
}

/**
 * 设置对话框的 "安全" 分区: 依次是 "主密码", "恢复密钥", "空闲自动锁定", "锁屏时锁定" 与 "休眠时锁定"
 * 五行, 名称与说明是本分区自己的文案, 右侧是装配层提供的开关与按钮. 没有设主密码时自动锁定不生效,
 * 三个自动锁定行之后有一行说明原因.
 * @param props 组件属性.
 * @returns 安全分区元素.
 */
export function SettingsSecuritySection(
  props: SettingsSecuritySectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t("settings.security.title")}>
      <SettingsRow
        name={t("settings.security.masterPassword.name")}
        description={t("settings.security.masterPassword.description")}
        action={props.entries.masterPasswordAction}
      />
      <SettingsRow
        name={t("settings.security.recoveryKey.name")}
        description={t("settings.security.recoveryKey.description")}
        action={props.entries.recoveryKeyAction}
      />
      <SettingsRow
        name={t("settings.security.autoLock.idle.name")}
        description={t("settings.security.autoLock.idle.description")}
        action={props.entries.idleLockAction}
      />
      <SettingsRow
        name={t("settings.security.autoLock.screenLock.name")}
        description={t("settings.security.autoLock.screenLock.description")}
        action={props.entries.screenLockAction}
      />
      <SettingsRow
        name={t("settings.security.autoLock.sleep.name")}
        description={t("settings.security.autoLock.sleep.description")}
        action={props.entries.sleepLockAction}
      />
      {props.entries.isAutoLockUnavailable && (
        <p role="note" className="text-sm text-muted-foreground">
          {t("settings.security.autoLock.unavailable")}
        </p>
      )}
    </SettingsSection>
  );
}
