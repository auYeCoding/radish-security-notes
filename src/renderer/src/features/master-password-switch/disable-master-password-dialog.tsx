import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { NameDialogShell } from "@renderer/components/name-dialog-shell";
import { useMasterPasswordBridge } from "@renderer/stores/use-master-password-bridge";
import { useVaultOperation } from "@renderer/stores/use-vault-operation";

import { DisableMasterPasswordFields } from "./disable-master-password-fields";
import {
  DISABLE_DEFAULT_VALUES,
  disableMasterPasswordSchema,
  type DisableMasterPasswordValues,
} from "./disable-master-password-schema";

/**
 * 关闭主密码对话框的属性.
 */
interface DisableMasterPasswordDialogProps {
  /**
   * 对话框要关闭时的回调, 取消, 按 Esc, 点遮罩或点关闭按钮之后调用.
   */
  readonly onClose: () => void;
  /**
   * 关闭成功后的回调, 调用方负责关闭对话框并刷新开关.
   */
  readonly onSucceeded: () => void;
}

/**
 * 关闭主密码对话框, 挂载即打开, 关闭即卸载: 写明关闭后的保护强度, 要求输入当前主密码并勾选已了解,
 * 两者缺一不可. 失败时保持原状; 系统密钥可能要等十几秒才落盘, 提交进行中显示等待说明且不响应
 * 关闭.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function DisableMasterPasswordDialog(
  props: DisableMasterPasswordDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const bridge = useMasterPasswordBridge();
  const { failureReason, run } = useVaultOperation();
  const form = useForm<DisableMasterPasswordValues>({
    resolver: zodResolver(disableMasterPasswordSchema),
    defaultValues: DISABLE_DEFAULT_VALUES,
  });
  const submit = async (values: DisableMasterPasswordValues): Promise<void> => {
    const result = await run(() => bridge.disable(values.currentPassword));
    if (result.ok) {
      props.onSucceeded();
    }
  };
  return (
    <NameDialogShell
      title={t("settings.security.masterPassword.disable.title")}
      description={t("settings.security.masterPassword.disable.description")}
      cancelLabel={t("settings.security.masterPassword.disable.cancel")}
      submitLabel={t("settings.security.masterPassword.disable.submit")}
      submittingLabel={t("settings.security.masterPassword.disable.submitting")}
      isSubmitting={form.formState.isSubmitting}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      onClose={props.onClose}
    >
      <DisableMasterPasswordFields form={form} failureReason={failureReason} />
    </NameDialogShell>
  );
}
