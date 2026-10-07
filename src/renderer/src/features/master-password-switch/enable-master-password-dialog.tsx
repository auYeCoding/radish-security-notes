import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { NameDialogShell } from "@renderer/components/name-dialog-shell";
import { NewPasswordFields } from "@renderer/components/new-password-fields";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldGroup } from "@renderer/components/ui/field";
import { useVaultOperation } from "@renderer/stores/use-vault-operation";
import { useMasterPasswordBridge } from "@renderer/stores/use-master-password-bridge";
import {
  PASSWORD_MISMATCH_ISSUE,
  isPasswordConfirmed,
  newPasswordShape,
} from "@shared/vault/new-password-rules";

import { describeMasterPasswordFailure } from "./describe-master-password-failure";

/**
 * 开启主密码表单的校验方案: 主密码够长, 两次输入一致, 规则与首次引导一致.
 */
const enableMasterPasswordSchema = z
  .object(newPasswordShape)
  .refine(isPasswordConfirmed, PASSWORD_MISMATCH_ISSUE);

/**
 * 开启主密码表单的取值.
 */
type EnableMasterPasswordValues = z.infer<typeof enableMasterPasswordSchema>;

/**
 * 开启主密码表单的初始取值.
 */
const DEFAULT_VALUES: EnableMasterPasswordValues = {
  password: "",
  confirmation: "",
};

/**
 * 开启主密码对话框的属性.
 */
interface EnableMasterPasswordDialogProps {
  /**
   * 对话框要关闭时的回调, 取消, 按 Esc, 点遮罩或点关闭按钮之后调用.
   */
  readonly onClose: () => void;
  /**
   * 开启成功后的回调, 调用方负责关闭对话框并刷新开关.
   */
  readonly onSucceeded: () => void;
}

/**
 * 开启主密码对话框, 挂载即打开, 关闭即卸载: 输入新主密码并再输一次, 提交后由主进程把数据密钥改用
 * 新主密码保护. 不合规与不一致的错误显示在对应字段下方, 其它失败显示在顶部提示条, 失败时保持原状;
 * 提交进行中不响应关闭.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function EnableMasterPasswordDialog(
  props: EnableMasterPasswordDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const bridge = useMasterPasswordBridge();
  const { failureReason, run } = useVaultOperation();
  const { register, handleSubmit, formState } =
    useForm<EnableMasterPasswordValues>({
      resolver: zodResolver(enableMasterPasswordSchema),
      defaultValues: DEFAULT_VALUES,
    });
  const failureMessage = describeMasterPasswordFailure(failureReason, t);
  const submit = async (values: EnableMasterPasswordValues): Promise<void> => {
    const result = await run(() => bridge.enable(values.password));
    if (result.ok) {
      props.onSucceeded();
    }
  };
  return (
    <NameDialogShell
      title={t("settings.security.masterPassword.enable.title")}
      description={t("settings.security.masterPassword.enable.description")}
      cancelLabel={t("settings.security.masterPassword.enable.cancel")}
      submitLabel={t("settings.security.masterPassword.enable.submit")}
      submittingLabel={t("settings.security.masterPassword.enable.submitting")}
      isSubmitting={formState.isSubmitting}
      onSubmit={(event) => void handleSubmit(submit)(event)}
      onClose={props.onClose}
    >
      <FieldGroup>
        {failureMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{failureMessage}</AlertDescription>
          </Alert>
        )}
        <NewPasswordFields
          passwordProps={register("password")}
          confirmationProps={register("confirmation")}
          passwordErrorCode={formState.errors.password?.message}
          confirmationErrorCode={formState.errors.confirmation?.message}
        />
      </FieldGroup>
    </NameDialogShell>
  );
}
