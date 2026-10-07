import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import {
  SettingsDataSection,
  type SettingsDataEntries,
} from "./settings-data-section";
import {
  SettingsSecuritySection,
  type SettingsSecurityEntries,
} from "./settings-security-section";

/**
 * 设置对话框的属性.
 */
interface SettingsDialogProps {
  /**
   * 对话框要关闭时的回调.
   */
  readonly onClose: () => void;
  /**
   * "数据" 分区四行右侧的操作元素.
   */
  readonly data: SettingsDataEntries;
  /**
   * "安全" 分区两行右侧的操作元素.
   */
  readonly security: SettingsSecurityEntries;
}

/**
 * 设置对话框, 挂载即打开, 关闭即卸载: 各分区纵向排列, 依次是 "数据" 与 "安全" 分区. 分区里的操作元素
 * 在这个对话框的子树里再打开功能对话框, 功能对话框叠在设置对话框之上, 按 Escape 一次只关最上层.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function SettingsDialog(props: SettingsDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      props.onClose();
    }
  };
  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("settings.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <SettingsDataSection entries={props.data} />
        <SettingsSecuritySection entries={props.security} />
      </DialogContent>
    </Dialog>
  );
}
