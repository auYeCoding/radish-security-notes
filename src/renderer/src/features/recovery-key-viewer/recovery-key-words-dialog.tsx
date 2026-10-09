import { useTranslation } from "react-i18next";

import { RecoveryWordsDisplay } from "@renderer/components/recovery-words-display";
import {
  DialogScrollBody,
  ScrollableDialogContent,
} from "@renderer/components/scrollable-dialog";
import { Button } from "@renderer/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";
import { useVaultStore } from "@renderer/stores/use-vault-store";

import { RecoveryKeyPrintPortal } from "./recovery-key-print-portal";
import { RECOVERY_KEY_AUTO_HIDE_SECONDS, useAutoHide } from "./use-auto-hide";

/**
 * 展示步骤对话框的属性.
 */
interface RecoveryKeyWordsDialogProps {
  /**
   * 要展示的 24 个恢复词.
   */
  readonly words: readonly string[];
  /**
   * 点 "隐藏" 时的回调, 词被清除并回到验证步骤.
   */
  readonly onHide: () => void;
  /**
   * 显示满固定时长自动隐藏时的回调, 词被清除并回到验证步骤.
   */
  readonly onAutoHide: () => void;
  /**
   * 对话框要关闭时的回调, 点 "完成", 按 Esc, 点遮罩或点关闭按钮之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 展示步骤底部操作区的属性.
 */
interface RecoveryKeyWordsActionsProps {
  /**
   * 点 "隐藏" 时的回调.
   */
  readonly onHide: () => void;
  /**
   * 点 "完成" 时的回调.
   */
  readonly onClose: () => void;
}

/**
 * 展示步骤的底部操作区: "隐藏" 与 "完成" 两个按钮.
 * @param props 组件属性.
 * @returns 操作区元素.
 */
function RecoveryKeyWordsActions(
  props: RecoveryKeyWordsActionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={props.onHide}>
        {t("settings.security.recoveryKey.shown.hide")}
      </Button>
      <Button type="button" onClick={props.onClose}>
        {t("settings.security.recoveryKey.shown.done")}
      </Button>
    </DialogFooter>
  );
}

/**
 * 查看恢复密钥的展示步骤, 挂载即打开, 关闭即卸载: 24 个编号恢复词, 打印恢复套件与保存为文本文件,
 * 没有复制入口. 显示满固定时长后自动隐藏; 打印版式只在这一步存在. 词只在这个组件存在期间留在
 * 渲染端内存里.
 * @param props 组件属性.
 * @returns 对话框与打印版式元素.
 */
export function RecoveryKeyWordsDialog(
  props: RecoveryKeyWordsDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const saveRecoveryTextFile = useVaultStore(
    (state) => state.saveRecoveryTextFile,
  );
  useAutoHide(props.onAutoHide);
  return (
    <>
      <Dialog
        open
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            props.onClose();
          }
        }}
      >
        <ScrollableDialogContent
          closeLabel={t("common.close")}
          className="sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>
              {t("settings.security.recoveryKey.shown.title")}
            </DialogTitle>
            <DialogDescription>
              {t("settings.security.recoveryKey.shown.description", {
                seconds: RECOVERY_KEY_AUTO_HIDE_SECONDS,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogScrollBody>
            <RecoveryWordsDisplay
              words={props.words}
              onSaveTextFile={saveRecoveryTextFile}
            />
          </DialogScrollBody>
          <RecoveryKeyWordsActions
            onHide={props.onHide}
            onClose={props.onClose}
          />
        </ScrollableDialogContent>
      </Dialog>
      <RecoveryKeyPrintPortal words={props.words} />
    </>
  );
}
