import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { PasswordField } from "@renderer/components/password-field";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldGroup } from "@renderer/components/ui/field";
import { MASTER_PASSWORD_MIN_LENGTH } from "@shared/vault/master-password-policy";

import { AcknowledgementField } from "./acknowledgement-field";
import { OnboardingActions } from "./onboarding-actions";
import {
  describeOnboardingError,
  onboardingSchema,
  type OnboardingFormValues,
} from "./onboarding-schema";

/**
 * 引导表单的属性.
 */
interface OnboardingFormProps {
  /**
   * 表单校验通过后的回调, 参数是用户设置的主密码.
   */
  readonly onSubmit: (masterPassword: string) => void;
  /**
   * 点击 "跳过" 时的回调.
   */
  readonly onSkipRequest: () => void;
  /**
   * 设置操作是否正在执行, 执行中禁用按钮.
   */
  readonly isPending: boolean;
  /**
   * 与具体字段无关的错误文字, 显示在表单顶部的提示条里.
   */
  readonly alertMessage?: string;
}

/**
 * 引导表单的默认取值.
 */
const DEFAULT_VALUES: OnboardingFormValues = {
  password: "",
  confirmation: "",
  acknowledged: false,
};

/**
 * 设置主密码的表单: 主密码与确认输入, 遗忘提示与确认勾选, 设置与跳过按钮. 校验错误显示
 * 在对应字段下方, 与字段无关的错误显示在顶部的提示条里.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function OnboardingForm(props: OnboardingFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { register, control, handleSubmit, formState } =
    useForm<OnboardingFormValues>({
      resolver: zodResolver(onboardingSchema),
      defaultValues: DEFAULT_VALUES,
    });
  const { errors } = formState;
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
        <PasswordField
          {...register("password")}
          label={t("vault.onboarding.passwordLabel")}
          description={t("vault.onboarding.passwordHint", {
            minLength: MASTER_PASSWORD_MIN_LENGTH,
          })}
          autoComplete="new-password"
          error={describeOnboardingError(errors.password?.message, t)}
        />
        <PasswordField
          {...register("confirmation")}
          label={t("vault.onboarding.confirmationLabel")}
          autoComplete="new-password"
          error={describeOnboardingError(errors.confirmation?.message, t)}
        />
        <AcknowledgementField
          control={control}
          errorCode={errors.acknowledged?.message}
        />
        <OnboardingActions
          isPending={props.isPending}
          onSkipRequest={props.onSkipRequest}
        />
      </FieldGroup>
    </form>
  );
}
