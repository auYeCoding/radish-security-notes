import { useId } from "react";
import { Controller, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@renderer/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@renderer/components/ui/field";

import {
  describeOnboardingError,
  type OnboardingFormValues,
} from "./onboarding-schema";

/**
 * 确认勾选字段的属性.
 */
interface AcknowledgementFieldProps {
  /**
   * 表单的控制器.
   */
  readonly control: Control<OnboardingFormValues>;
  /**
   * 勾选项的校验错误代码, 没有错误时为 undefined.
   */
  readonly errorCode: string | undefined;
}

/**
 * "我已了解" 确认勾选: 勾选框, 标签, 忘记主密码的提示和未勾选时的错误. 提示文字挂在勾选框
 * 的无障碍描述上.
 * @param props 组件属性.
 * @returns 确认勾选字段元素.
 */
export function AcknowledgementField(
  props: AcknowledgementFieldProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const identifier = useId();
  const hasError = props.errorCode !== undefined;
  return (
    <div className="flex flex-col gap-2">
      <FieldDescription id={`${identifier}-notice`}>
        {t("vault.onboarding.forgetNotice")}
      </FieldDescription>
      <Controller
        control={props.control}
        name="acknowledged"
        render={({ field }) => (
          <Field orientation="horizontal" data-invalid={hasError}>
            <Checkbox
              id={identifier}
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-invalid={hasError}
              aria-describedby={`${identifier}-notice`}
            />
            <FieldLabel htmlFor={identifier}>
              {t("vault.onboarding.acknowledgeLabel")}
            </FieldLabel>
          </Field>
        )}
      />
      <FieldError>{describeOnboardingError(props.errorCode, t)}</FieldError>
    </div>
  );
}
