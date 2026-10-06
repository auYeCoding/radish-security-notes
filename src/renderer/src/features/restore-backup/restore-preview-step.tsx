import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";

import type { PreviewStepState } from "./restore-flow-state";
import { RestoreMasterPasswordField } from "./restore-master-password-field";
import { RestorePreviewSummary } from "./restore-preview-summary";
import { RestoreReplaceWarning } from "./restore-replace-warning";
import { canConfirmRestore } from "./restore-step-rules";

/**
 * 预览步骤的属性.
 */
interface RestorePreviewStepProps {
  /**
   * 预览步骤的状态.
   */
  readonly state: PreviewStepState;
  /**
   * 改动主密码的回调.
   */
  readonly onMasterPasswordChange: (masterPassword: string) => void;
  /**
   * 勾选或取消勾选清空确认的回调.
   */
  readonly onAcknowledgedReplaceChange: (hasAcknowledged: boolean) => void;
  /**
   * 点 "开始恢复" 或 "清空并恢复" 时的回调.
   */
  readonly onConfirm: () => void;
  /**
   * 点 "重新选择" 时的回调.
   */
  readonly onBack: () => void;
}

/**
 * 预览与确认的步骤: 备份概要, 保险库为空时的说明或非空时的清空警示与确认, 设了主密码时重新输入
 * 主密码. 不满足条件时确认按钮不可点; 保险库非空时确认按钮是危险样式, 写明 "清空并恢复".
 * 点确认之前不会改动任何数据.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function RestorePreviewStep(
  props: RestorePreviewStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = props;
  const { preview } = state;
  const isVaultEmpty = preview.vault.isEmpty;
  return (
    <>
      <div className="flex flex-col gap-4">
        <RestorePreviewSummary preview={preview} />
        {isVaultEmpty ? (
          <p className="text-sm text-muted-foreground">
            {t("restore.preview.emptyVault")}
          </p>
        ) : (
          <RestoreReplaceWarning
            vault={preview.vault}
            hasAcknowledged={state.hasAcknowledgedReplace}
            onAcknowledgedChange={props.onAcknowledgedReplaceChange}
          />
        )}
        {preview.requiresMasterPassword && (
          <RestoreMasterPasswordField
            value={state.masterPassword}
            isWrong={state.isMasterPasswordWrong}
            onChange={props.onMasterPasswordChange}
          />
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={props.onBack}>
          {t("restore.preview.back")}
        </Button>
        <Button
          variant={isVaultEmpty ? "default" : "destructive"}
          onClick={props.onConfirm}
          disabled={!canConfirmRestore(state)}
        >
          {t(
            isVaultEmpty
              ? "restore.preview.submit"
              : "restore.preview.submitReplace",
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
