import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { NewPasswordFields } from "@renderer/components/new-password-fields";
import { PasswordSetupActions } from "@renderer/components/password-setup-actions";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldGroup } from "@renderer/components/ui/field";
import {
  PASSWORD_MISMATCH_ISSUE,
  isPasswordConfirmed,
  newPasswordShape,
} from "@shared/vault/new-password-rules";

/**
 * 恢复后设置新主密码表单的校验方案: 主密码够长, 两次输入一致.
 */
const restoreProtectionSchema = z
  .object(newPasswordShape)
  .refine(isPasswordConfirmed, PASSWORD_MISMATCH_ISSUE);

/**
 * 恢复后设置新主密码表单的取值.
 */
type RestoreProtectionValues = z.infer<typeof restoreProtectionSchema>;

/**
 * 恢复后设置新主密码表单的属性.
 */
interface RestoreProtectionFormProps {
  /**
   * 校验通过后的回调, 参数是新主密码.
   */
  readonly onSubmit: (masterPassword: string) => void;
  /**
   * 点击 "跳过主密码" 时的回调.
   */
  readonly onSkipRequest: () => void;
  /**
   * 恢复操作是否正在执行, 执行中禁用按钮.
   */
  readonly isPending: boolean;
  /**
   * 与具体字段无关的错误文字, 显示在表单顶部的提示条里.
   */
  readonly alertMessage?: string;
}

/**
 * 表单的初始取值.
 */
const DEFAULT_VALUES: RestoreProtectionValues = {
  password: "",
  confirmation: "",
};

/**
 * 恢复后设置新保护的表单: 新主密码与确认输入, "设置并解锁" 主按钮与 "跳过主密码" 次要按钮.
 * 不要求 "我已了解" 勾选, 因为原恢复词仍然有效.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function RestoreProtectionForm(
  props: RestoreProtectionFormProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { register, handleSubmit, formState } =
    useForm<RestoreProtectionValues>({
      resolver: zodResolver(restoreProtectionSchema),
      defaultValues: DEFAULT_VALUES,
    });
  return (
    <form
      noValidate
      onSubmit={(event) =>
        void handleSubmit((values) => props.onSubmit(values.password))(event)
      }
    >
      <FieldGroup>
        {props.alertMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{props.alertMessage}</AlertDescription>
          </Alert>
        )}
        <NewPasswordFields
          passwordProps={register("password")}
          confirmationProps={register("confirmation")}
          passwordErrorCode={formState.errors.password?.message}
          confirmationErrorCode={formState.errors.confirmation?.message}
        />
        <PasswordSetupActions
          isPending={props.isPending}
          submitLabel={t("vault.restore.protection.submit")}
          pendingLabel={t("vault.onboarding.submitting")}
          skipLabel={t("vault.restore.protection.skip")}
          onSkipRequest={props.onSkipRequest}
        />
      </FieldGroup>
    </form>
  );
}
