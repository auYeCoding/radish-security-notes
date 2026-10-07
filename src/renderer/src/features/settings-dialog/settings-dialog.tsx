import { useRef } from "react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import { SETTINGS_DIALOG_BODY_SLOT } from "./settings-dialog-body-slot";
import {
  SettingsAppearanceSection,
  type SettingsAppearanceEntries,
} from "./settings-appearance-section";
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
   * "外观与语言" 分区两行右侧的操作元素.
   */
  readonly appearance: SettingsAppearanceEntries;
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
 * 设置对话框, 挂载即打开, 关闭即卸载: 各分区纵向排列, 依次是 "外观与语言", "数据" 与 "安全" 分区.
 * 标题区固定, 分区内容超过窗口高度时在对话框内部纵向滚动. 打开时焦点落在对话框面板上, 不落在第一个
 * 分段按钮上, 避免弹出悬停提示而让第一次 Escape 只关掉提示. 分区里的操作元素在这个对话框的子树里再
 * 打开功能对话框, 功能对话框叠在设置对话框之上, 按 Escape 一次只关最上层.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function SettingsDialog(props: SettingsDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      props.onClose();
    }
  };
  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        ref={panelRef}
        initialFocus={panelRef}
        closeLabel={t("common.close")}
        className="flex max-h-11/12 flex-col sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{t("settings.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div
          data-slot={SETTINGS_DIALOG_BODY_SLOT}
          className="-m-1 flex min-h-0 flex-col gap-4 overflow-y-auto p-1"
        >
          <SettingsAppearanceSection entries={props.appearance} />
          <SettingsDataSection entries={props.data} />
          <SettingsSecuritySection entries={props.security} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
