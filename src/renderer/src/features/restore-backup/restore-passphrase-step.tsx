import { useTranslation } from "react-i18next";

import { formatByteSize } from "@renderer/components/format-byte-size";
import { PasswordField } from "@renderer/components/password-field";
import { DialogScrollBody } from "@renderer/components/scrollable-dialog";
import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";

import type { PassphraseStepState } from "./restore-flow-state";
import { canSubmitPassphrase } from "./restore-step-rules";

/**
 * 输入口令步骤的属性.
 */
interface RestorePassphraseStepProps {
  /**
   * 输入口令步骤的状态.
   */
  readonly state: PassphraseStepState;
  /**
   * 改动口令的回调.
   */
  readonly onPassphraseChange: (passphrase: string) => void;
  /**
   * 提交口令的回调.
   */
  readonly onSubmit: () => void;
  /**
   * 点 "重新选择" 时的回调.
   */
  readonly onBack: () => void;
}

/**
 * 输入备份口令的步骤: 文件大小的说明, 口令输入框 (口令不对时在框下提示) 和 "解密并预览" 按钮.
 * 回车也可以提交; 提交之后口令不再显示.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function RestorePassphraseStep(
  props: RestorePassphraseStepProps,
): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { state } = props;
  return (
    <form
      noValidate
      className="flex min-h-0 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <DialogScrollBody className="gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">
            {t("restore.passphrase.heading")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("restore.passphrase.description", {
              size: formatByteSize(state.fileSizeBytes, t, i18n.language),
            })}
          </p>
        </div>
        <PasswordField
          label={t("restore.passphrase.label")}
          autoComplete="off"
          value={state.passphrase}
          onChange={(event) => props.onPassphraseChange(event.target.value)}
          error={
            state.isPassphraseWrong ? t("restore.passphrase.wrong") : undefined
          }
        />
      </DialogScrollBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={props.onBack}>
          {t("restore.passphrase.back")}
        </Button>
        <Button type="submit" disabled={!canSubmitPassphrase(state)}>
          {t("restore.passphrase.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
