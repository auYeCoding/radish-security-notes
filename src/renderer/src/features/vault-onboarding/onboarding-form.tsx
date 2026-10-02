import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { NewPasswordFields } from "@renderer/components/new-password-fields";
import { PasswordSetupActions } from "@renderer/components/password-setup-actions";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldGroup } from "@renderer/components/ui/field";

import { AcknowledgementField } from "./acknowledgement-field";
import {
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
        <NewPasswordFields
          passwordProps={register("password")}
          confirmationProps={register("confirmation")}
          passwordErrorCode={errors.password?.message}
          confirmationErrorCode={errors.confirmation?.message}
        />
        <AcknowledgementField
          control={control}
          errorCode={errors.acknowledged?.message}
        />
        <PasswordSetupActions
          isPending={props.isPending}
          submitLabel={t("vault.onboarding.submit")}
          pendingLabel={t("vault.onboarding.submitting")}
          skipLabel={t("vault.onboarding.skip")}
          onSkipRequest={props.onSkipRequest}
        />
      </FieldGroup>
    </form>
  );
}
